const { getDatabase } = require('../../shared/db/database')
const AppError = require('../../shared/errors/AppError')
const ValidationService = require('./ValidationService')
const WebSocketService = require('./WebSocketService')
const logger = require('../../shared/logging/logger')

class EntityService {
  constructor (entityConfig) {
    this.config = entityConfig
    this.tableName = entityConfig.name.toLowerCase() + 's'
    this.validationService = new ValidationService(entityConfig)
  }

  async getAll (req, res, next) {
    try {
      const db = getDatabase()
      const {
        page = 1,
        limit = 10,
        sort = 'id',
        order = 'asc',
        search,
        ...filters
      } = req.query

      let query = db(this.tableName).select('*')

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (this.config.attributes[key] && value) {
          if (Array.isArray(value)) {
            query = query.whereIn(key, value)
          } else {
            query = query.where(key, value)
          }
        }
      })

      // Apply search
      if (search && this.config.ui?.listView?.searchable) {
        const searchFields = this.config.ui.listView.searchable
        query = query.where((builder) => {
          searchFields.forEach((field, index) => {
            if (index === 0) {
              builder.where(field, 'LIKE', `%${search}%`)
            } else {
              builder.orWhere(field, 'LIKE', `%${search}%`)
            }
          })
        })
      }

      // Get total count for pagination
      const totalQuery = query.clone()
      const [{ count }] = await totalQuery.count('* as count')

      // Apply sorting
      const validSortFields = this.config.ui?.listView?.sortable || Object.keys(this.config.attributes)
      const sortField = validSortFields.includes(sort) ? sort : 'id'
      const sortOrder = ['asc', 'desc'].includes(order) ? order : 'asc'

      query = query.orderBy(sortField, sortOrder)

      // Apply pagination
      const offset = (page - 1) * limit
      query = query.limit(limit).offset(offset)

      const data = await query

      // Apply relationships if needed
      const dataWithRelations = await this._loadRelationships(data)

      res.status(200).json({
        status: 'success',
        results: data.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        },
        data: dataWithRelations
      })
    } catch (error) {
      next(error)
    }
  }

  async getById (req, res, next) {
    try {
      const db = getDatabase()
      const { id } = req.params

      const data = await db(this.tableName)
        .select('*')
        .where('id', id)
        .first()

      if (!data) {
        return next(new AppError(`${this.config.displayName} not found`, 404))
      }

      // Load relationships
      const dataWithRelations = await this._loadRelationships([data])

      res.status(200).json({
        status: 'success',
        data: dataWithRelations[0]
      })
    } catch (error) {
      next(error)
    }
  }

  async create (req, res, next) {
    try {
      const db = getDatabase()

      // Validate input
      const validationResult = await this.validationService.validate(req.body, 'create')
      if (!validationResult.isValid) {
        return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', validationResult.errors))
      }

      // Add timestamps
      const now = new Date().toISOString()
      const data = {
        ...req.body,
        createdAt: now,
        updatedAt: now
      }

      const [id] = await db(this.tableName).insert(data)
      const newRecord = await db(this.tableName)
        .select('*')
        .where('id', id)
        .first()

      // Load relationships
      const dataWithRelations = await this._loadRelationships([newRecord])

      // Emit WebSocket event
      WebSocketService.emit(`${this.config.name.toLowerCase()}:created`, dataWithRelations[0])

      logger.info(`${this.config.displayName} created`, { id, data })

      res.status(201).json({
        status: 'success',
        data: dataWithRelations[0]
      })
    } catch (error) {
      next(error)
    }
  }

  async update (req, res, next) {
    try {
      const db = getDatabase()
      const { id } = req.params

      // Check if record exists
      const existingRecord = await db(this.tableName)
        .select('*')
        .where('id', id)
        .first()

      if (!existingRecord) {
        return next(new AppError(`${this.config.displayName} not found`, 404))
      }

      // Validate input
      const validationResult = await this.validationService.validate(req.body, 'update')
      if (!validationResult.isValid) {
        return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', validationResult.errors))
      }

      // Update data
      const data = {
        ...req.body,
        updatedAt: new Date().toISOString()
      }

      await db(this.tableName)
        .where('id', id)
        .update(data)

      const updatedRecord = await db(this.tableName)
        .select('*')
        .where('id', id)
        .first()

      // Load relationships
      const dataWithRelations = await this._loadRelationships([updatedRecord])

      // Emit WebSocket event
      WebSocketService.emit(`${this.config.name.toLowerCase()}:updated`, dataWithRelations[0])

      logger.info(`${this.config.displayName} updated`, { id, data })

      res.status(200).json({
        status: 'success',
        data: dataWithRelations[0]
      })
    } catch (error) {
      next(error)
    }
  }

  async delete (req, res, next) {
    try {
      const db = getDatabase()
      const { id } = req.params

      // Check if record exists
      const existingRecord = await db(this.tableName)
        .select('*')
        .where('id', id)
        .first()

      if (!existingRecord) {
        return next(new AppError(`${this.config.displayName} not found`, 404))
      }

      await db(this.tableName)
        .where('id', id)
        .del()

      // Emit WebSocket event
      WebSocketService.emit(`${this.config.name.toLowerCase()}:deleted`, { id })

      logger.info(`${this.config.displayName} deleted`, { id })

      res.status(204).json({
        status: 'success',
        data: null
      })
    } catch (error) {
      next(error)
    }
  }

  async executeMethod (methodName, req, res, next) {
    try {
      const db = getDatabase()
      const { id } = req.params
      const methodConfig = this.config.methods[methodName]

      if (!methodConfig) {
        return next(new AppError(`Method ${methodName} not found`, 404))
      }

      // Check if record exists
      const existingRecord = await db(this.tableName)
        .select('*')
        .where('id', id)
        .first()

      if (!existingRecord) {
        return next(new AppError(`${this.config.displayName} not found`, 404))
      }

      // Validate method parameters if any
      if (methodConfig.parameters) {
        const validationResult = await this.validationService.validateMethodParams(
          req.body,
          methodConfig.parameters
        )
        if (!validationResult.isValid) {
          return next(new AppError('Parameter validation failed', 400, 'VALIDATION_ERROR', validationResult.errors))
        }
      }

      // Execute method based on action type
      let result
      switch (methodConfig.action) {
        case 'custom':
          result = await this._executeCustomMethod(methodName, methodConfig, existingRecord, req.body)
          break
        default:
          throw new AppError(`Unsupported method action: ${methodConfig.action}`, 500)
      }

      // Emit WebSocket event
      WebSocketService.emit(`${this.config.name.toLowerCase()}:${methodName}`, {
        id,
        method: methodName,
        data: result
      })

      logger.info(`${this.config.displayName} method executed`, { id, method: methodName, params: req.body })

      res.status(200).json({
        status: 'success',
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  async _executeCustomMethod (methodName, methodConfig, record, params) {
    const db = getDatabase()

    // Common method implementations
    switch (methodName) {
      case 'activate':
        await db(this.tableName)
          .where('id', record.id)
          .update({
            status: 'active',
            updatedAt: new Date().toISOString()
          })
        return { ...record, status: 'active' }

      case 'suspend':
        await db(this.tableName)
          .where('id', record.id)
          .update({
            status: 'suspended',
            updatedAt: new Date().toISOString()
          })
        return { ...record, status: 'suspended' }

      case 'process':
        await db(this.tableName)
          .where('id', record.id)
          .update({
            status: 'processing',
            updatedAt: new Date().toISOString()
          })
        return { ...record, status: 'processing' }

      case 'ship':
        const shippedData = {
          status: 'shipped',
          shippedDate: new Date().toISOString(),
          trackingNumber: params.trackingNumber,
          carrier: params.carrier,
          updatedAt: new Date().toISOString()
        }
        await db(this.tableName)
          .where('id', record.id)
          .update(shippedData)
        return { ...record, ...shippedData }

      case 'cancel':
        const cancelData = {
          status: 'cancelled',
          cancelReason: params.reason,
          updatedAt: new Date().toISOString()
        }
        await db(this.tableName)
          .where('id', record.id)
          .update(cancelData)
        return { ...record, ...cancelData }

      case 'refund':
        const refundData = {
          status: 'refunded',
          refundAmount: params.amount,
          refundReason: params.reason,
          refundDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await db(this.tableName)
          .where('id', record.id)
          .update(refundData)
        return { ...record, ...refundData }

      default:
        // For other custom methods, just update the record with provided params
        const updateData = {
          ...params,
          updatedAt: new Date().toISOString()
        }
        await db(this.tableName)
          .where('id', record.id)
          .update(updateData)
        return { ...record, ...updateData }
    }
  }

  async _loadRelationships (data) {
    if (!this.config.relationships || !Array.isArray(data)) {
      return data
    }

    const db = getDatabase()

    for (const record of data) {
      for (const [relationName, relationConfig] of Object.entries(this.config.relationships)) {
        try {
          switch (relationConfig.type) {
            case 'oneToOne':
              if (relationConfig.foreignKey && record[relationConfig.foreignKey]) {
                const related = await db(relationConfig.target.toLowerCase() + 's')
                  .select('*')
                  .where('id', record[relationConfig.foreignKey])
                  .first()
                record[relationName] = related
              }
              break

            case 'oneToMany':
              if (relationConfig.foreignKey) {
                const related = await db(relationConfig.target.toLowerCase() + 's')
                  .select('*')
                  .where(relationConfig.foreignKey, record.id)
                record[relationName] = related
              }
              break

            case 'manyToOne':
              if (relationConfig.foreignKey && record[relationConfig.foreignKey]) {
                const related = await db(relationConfig.target.toLowerCase() + 's')
                  .select('*')
                  .where('id', record[relationConfig.foreignKey])
                  .first()
                record[relationName] = related
              }
              break

            case 'manyToMany':
              if (relationConfig.through) {
                const related = await db(relationConfig.target.toLowerCase() + 's')
                  .select(`${relationConfig.target.toLowerCase()}s.*`)
                  .join(
                    relationConfig.through,
                    `${relationConfig.target.toLowerCase()}s.id`,
                    `${relationConfig.through}.${relationConfig.target.toLowerCase()}Id`
                  )
                  .where(`${relationConfig.through}.${this.config.name.toLowerCase()}Id`, record.id)
                record[relationName] = related
              }
              break
          }
        } catch (error) {
          logger.warn(`Failed to load relationship ${relationName}:`, error)
          record[relationName] = null
        }
      }
    }

    return data
  }
}

module.exports = EntityService