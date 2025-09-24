const Joi = require('joi')
const { getDatabase } = require('../../shared/db/database')

class ValidationService {
  constructor (entityConfig) {
    this.config = entityConfig
    this.tableName = entityConfig.name.toLowerCase() + 's'
  }

  async validate (data, operation = 'create') {
    try {
      // Build Joi schema from entity configuration
      const schema = this._buildJoiSchema(operation)

      // Validate with Joi
      const { error, value } = schema.validate(data, { abortEarly: false })

      if (error) {
        return {
          isValid: false,
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context.value
          }))
        }
      }

      // Custom validations
      const customErrors = await this._runCustomValidations(value, operation)

      if (customErrors.length > 0) {
        return {
          isValid: false,
          errors: customErrors
        }
      }

      return {
        isValid: true,
        data: value
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{ message: 'Validation error occurred', error: error.message }]
      }
    }
  }

  async validateMethodParams (data, parametersConfig) {
    try {
      const schemaFields = {}

      // Build schema from parameters configuration
      for (const [paramName, paramConfig] of Object.entries(parametersConfig)) {
        schemaFields[paramName] = this._buildJoiField(paramConfig)
      }

      const schema = Joi.object(schemaFields)
      const { error, value } = schema.validate(data, { abortEarly: false })

      if (error) {
        return {
          isValid: false,
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context.value
          }))
        }
      }

      return {
        isValid: true,
        data: value
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{ message: 'Parameter validation error occurred', error: error.message }]
      }
    }
  }

  _buildJoiSchema (operation = 'create') {
    const schemaFields = {}

    for (const [attrName, attrConfig] of Object.entries(this.config.attributes)) {
      // Skip auto-generated fields
      if (attrName === 'id' || attrName === 'createdAt' || attrName === 'updatedAt') {
        continue
      }

      let field = this._buildJoiField(attrConfig)

      // Handle required fields
      if (attrConfig.required) {
        if (operation === 'create') {
          field = field.required()
        }
      } else {
        field = field.optional()
      }

      schemaFields[attrName] = field
    }

    return Joi.object(schemaFields)
  }

  _buildJoiField (config) {
    let field

    switch (config.type) {
      case 'string':
        field = Joi.string()
        if (config.length) {
          field = field.max(config.length)
        }
        if (config.pattern) {
          field = field.pattern(new RegExp(config.pattern))
        }
        if (config.enum) {
          field = field.valid(...config.enum)
        }
        break

      case 'email':
        field = Joi.string().email()
        if (config.length) {
          field = field.max(config.length)
        }
        break

      case 'url':
        field = Joi.string().uri()
        break

      case 'number':
        field = Joi.number()
        if (config.min !== undefined) {
          field = field.min(config.min)
        }
        if (config.max !== undefined) {
          field = field.max(config.max)
        }
        break

      case 'integer':
        field = Joi.number().integer()
        if (config.min !== undefined) {
          field = field.min(config.min)
        }
        if (config.max !== undefined) {
          field = field.max(config.max)
        }
        break

      case 'boolean':
        field = Joi.boolean()
        break

      case 'date':
        field = Joi.date().iso()
        break

      case 'datetime':
        field = Joi.date().iso()
        break

      case 'text':
        field = Joi.string()
        if (config.length) {
          field = field.max(config.length)
        }
        break

      case 'json':
        field = Joi.alternatives().try(
          Joi.object(),
          Joi.array(),
          Joi.string().custom((value, helpers) => {
            try {
              return JSON.parse(value)
            } catch (error) {
              return helpers.error('any.invalid')
            }
          })
        )
        break

      default:
        field = Joi.any()
    }

    // Add default value if specified
    if (config.default !== undefined) {
      field = field.default(config.default)
    }

    return field
  }

  async _runCustomValidations (data, operation) {
    const errors = []

    if (!this.config.validation || !this.config.validation.rules) {
      return errors
    }

    const db = getDatabase()

    for (const rule of this.config.validation.rules) {
      try {
        switch (rule.rule) {
          case 'unique':
            if (data[rule.field]) {
              let query = db(this.tableName)
                .select('id')
                .where(rule.field, data[rule.field])

              // For updates, exclude the current record
              if (operation === 'update' && data.id) {
                query = query.where('id', '!=', data.id)
              }

              const existing = await query.first()
              if (existing) {
                errors.push({
                  field: rule.field,
                  message: rule.message || `${rule.field} must be unique`,
                  rule: 'unique'
                })
              }
            }
            break

          case 'exists':
            if (data[rule.field]) {
              const exists = await db(rule.table || this.tableName)
                .select('id')
                .where('id', data[rule.field])
                .first()

              if (!exists) {
                errors.push({
                  field: rule.field,
                  message: rule.message || `Referenced ${rule.field} does not exist`,
                  rule: 'exists'
                })
              }
            }
            break

          case 'custom':
            // Custom validation rules can be implemented here
            if (this.config.validation.custom) {
              const customValidator = this._getCustomValidator(this.config.validation.custom)
              if (customValidator) {
                const customErrors = await customValidator(data, operation, db)
                errors.push(...customErrors)
              }
            }
            break

          default:
            // Handle other validation rules as needed
            break
        }
      } catch (error) {
        errors.push({
          field: rule.field,
          message: `Validation error: ${error.message}`,
          rule: rule.rule
        })
      }
    }

    return errors
  }

  _getCustomValidator (validatorName) {
    // This would typically load custom validation functions
    // For now, we'll implement some common ones
    const validators = {
      validateOrderTotals: this._validateOrderTotals.bind(this)
    }

    return validators[validatorName]
  }

  async _validateOrderTotals (data, operation, db) {
    const errors = []

    // Check if total equals subtotal + tax + shipping
    const subtotal = parseFloat(data.subtotal) || 0
    const tax = parseFloat(data.tax) || 0
    const shipping = parseFloat(data.shipping) || 0
    const total = parseFloat(data.total) || 0

    const expectedTotal = subtotal + tax + shipping

    if (Math.abs(total - expectedTotal) > 0.01) { // Allow for small floating point differences
      errors.push({
        field: 'total',
        message: 'Total must equal subtotal + tax + shipping',
        rule: 'custom',
        expected: expectedTotal,
        actual: total
      })
    }

    return errors
  }
}

module.exports = ValidationService