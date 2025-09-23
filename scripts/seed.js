import DatabaseService from '../src/services/db.js';
import Person from '../src/entities/Person.js';
import PersonCredential from '../src/entities/PersonCredential.js';
import Organization from '../src/entities/Organization.js';
import OrganizationMember from '../src/entities/OrganizationMember.js';
import ProcedureTemplate from '../src/entities/ProcedureTemplate.js';

async function hashPassword(password, salt = null) {
    // Generate salt if not provided
    if (!salt) {
        salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return { hash, salt };
}

async function seedDatabase() {
    console.log('Starting database seeding...');

    const db = new DatabaseService();
    await db.init();

    try {
        // Create sample persons
        const persons = [
            new Person({
                first_name: 'John',
                last_name: 'Doe',
                primary_email_address: 'john@example.com',
                primary_phone_number: '+1234567890',
                date_of_birth: '1985-05-15'
            }),
            new Person({
                first_name: 'Jane',
                last_name: 'Smith',
                primary_email_address: 'jane@example.com',
                primary_phone_number: '+1234567891',
                date_of_birth: '1990-08-22'
            }),
            new Person({
                first_name: 'Alice',
                last_name: 'Johnson',
                primary_email_address: 'alice@example.com',
                primary_phone_number: '+1234567892',
                date_of_birth: '1988-12-03'
            }),
            new Person({
                first_name: 'Bob',
                last_name: 'Wilson',
                primary_email_address: 'bob@example.com',
                primary_phone_number: '+1234567893',
                date_of_birth: '1992-03-18'
            })
        ];

        console.log('Creating persons...');
        for (const person of persons) {
            await db.createPerson(person);
            console.log(`Created person: ${person.getDisplayName()}`);
        }

        // Create credentials for persons (password: "password123")
        console.log('Creating credentials...');
        for (const person of persons) {
            const { hash, salt } = await hashPassword('password123');
            const credential = new PersonCredential({
                person_id: person.id,
                email: person.primary_email_address,
                password_hash: hash,
                password_salt: salt,
                is_verified: true
            });

            await db.create('person_credentials', credential.toJSONWithSecrets());
            console.log(`Created credentials for: ${person.primary_email_address}`);
        }

        // Create sample organizations
        const organizations = [
            new Organization({
                name: 'Acme Corporation',
                display_name: 'Acme Corp',
                description: 'A leading technology company',
                industry: 'Technology',
                size: 'Medium',
                website_url: 'https://acme.com',
                primary_color: '#1976d2',
                secondary_color: '#dc004e',
                created_by: persons[0].id
            }),
            new Organization({
                name: 'Global Solutions Inc',
                display_name: 'Global Solutions',
                description: 'Worldwide consulting services',
                industry: 'Consulting',
                size: 'Large',
                website_url: 'https://globalsolutions.com',
                primary_color: '#2e7d32',
                secondary_color: '#ff6f00',
                created_by: persons[1].id
            }),
            new Organization({
                name: 'Startup Ventures',
                display_name: 'Startup Ventures',
                description: 'Innovation-driven startup',
                industry: 'Software',
                size: 'Small',
                primary_color: '#7b1fa2',
                secondary_color: '#f57c00',
                created_by: persons[2].id
            })
        ];

        console.log('Creating organizations...');
        for (const org of organizations) {
            await db.createOrganization(org);
            console.log(`Created organization: ${org.display_name}`);
        }

        // Create organization memberships
        console.log('Creating organization memberships...');

        // Acme Corporation members
        const acmeMembers = [
            new OrganizationMember({
                organization_id: organizations[0].id,
                person_id: persons[0].id,
                roles: [OrganizationMember.ROLES.CREATOR, OrganizationMember.ROLES.ADMIN],
                status: OrganizationMember.STATUS.ACTIVE
            }),
            new OrganizationMember({
                organization_id: organizations[0].id,
                person_id: persons[1].id,
                roles: [OrganizationMember.ROLES.MANAGER],
                status: OrganizationMember.STATUS.ACTIVE
            }),
            new OrganizationMember({
                organization_id: organizations[0].id,
                person_id: persons[3].id,
                roles: [OrganizationMember.ROLES.WORKER],
                status: OrganizationMember.STATUS.ACTIVE
            })
        ];

        // Global Solutions members
        const globalMembers = [
            new OrganizationMember({
                organization_id: organizations[1].id,
                person_id: persons[1].id,
                roles: [OrganizationMember.ROLES.CREATOR, OrganizationMember.ROLES.ADMIN],
                status: OrganizationMember.STATUS.ACTIVE
            }),
            new OrganizationMember({
                organization_id: organizations[1].id,
                person_id: persons[2].id,
                roles: [OrganizationMember.ROLES.WORKER],
                status: OrganizationMember.STATUS.ACTIVE
            })
        ];

        // Startup Ventures members
        const startupMembers = [
            new OrganizationMember({
                organization_id: organizations[2].id,
                person_id: persons[2].id,
                roles: [OrganizationMember.ROLES.CREATOR, OrganizationMember.ROLES.ADMIN],
                status: OrganizationMember.STATUS.ACTIVE
            })
        ];

        const allMembers = [...acmeMembers, ...globalMembers, ...startupMembers];

        for (const member of allMembers) {
            await db.createOrganizationMember(member);
            const person = persons.find(p => p.id === member.person_id);
            const org = organizations.find(o => o.id === member.organization_id);
            console.log(`Added ${person.getDisplayName()} to ${org.display_name} as ${member.roles.join(', ')}`);
        }

        // Create sample procedure templates
        console.log('Creating procedure templates...');

        const customerOnboardingProcedure = new ProcedureTemplate({
            organization_id: organizations[0].id,
            name: 'Customer Onboarding',
            description: 'Standard process for onboarding new customers',
            category: 'Customer Management',
            tags: ['onboarding', 'customer', 'sales'],
            created_by: persons[0].id,
            nodes: [
                {
                    id: 'start',
                    type: 'start',
                    name: 'Start Onboarding',
                    description: 'Begin the customer onboarding process',
                    position: { x: 100, y: 100 }
                },
                {
                    id: 'collect_info',
                    type: 'task',
                    name: 'Collect Customer Information',
                    description: 'Gather all necessary customer details and documentation',
                    role: 'sales',
                    position: { x: 100, y: 200 }
                },
                {
                    id: 'verify_documents',
                    type: 'task',
                    name: 'Verify Documents',
                    description: 'Review and verify customer documentation',
                    role: 'compliance',
                    position: { x: 100, y: 300 }
                },
                {
                    id: 'setup_account',
                    type: 'task',
                    name: 'Setup Customer Account',
                    description: 'Create customer account in system',
                    role: 'operations',
                    position: { x: 100, y: 400 }
                },
                {
                    id: 'send_welcome',
                    type: 'task',
                    name: 'Send Welcome Package',
                    description: 'Send welcome email and materials to customer',
                    role: 'customer_success',
                    position: { x: 100, y: 500 }
                },
                {
                    id: 'end',
                    type: 'end',
                    name: 'Onboarding Complete',
                    description: 'Customer onboarding process completed',
                    position: { x: 100, y: 600 }
                }
            ],
            edges: [
                { id: 'e1', from: 'start', to: 'collect_info' },
                { id: 'e2', from: 'collect_info', to: 'verify_documents' },
                { id: 'e3', from: 'verify_documents', to: 'setup_account' },
                { id: 'e4', from: 'setup_account', to: 'send_welcome' },
                { id: 'e5', from: 'send_welcome', to: 'end' }
            ],
            variables: {
                customer_name: { type: 'string', required: true },
                customer_type: { type: 'enum', values: ['individual', 'business'], default: 'individual' },
                priority: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium' }
            },
            settings: {
                auto_assign: true,
                notifications_enabled: true,
                estimated_duration: '3-5 business days'
            }
        });

        const projectApprovalProcedure = new ProcedureTemplate({
            organization_id: organizations[1].id,
            name: 'Project Approval Process',
            description: 'Workflow for approving new project proposals',
            category: 'Project Management',
            tags: ['approval', 'project', 'governance'],
            created_by: persons[1].id,
            nodes: [
                {
                    id: 'start',
                    type: 'start',
                    name: 'Submit Proposal',
                    description: 'Project proposal submitted for approval',
                    position: { x: 100, y: 100 }
                },
                {
                    id: 'initial_review',
                    type: 'task',
                    name: 'Initial Review',
                    description: 'Preliminary review of project proposal',
                    role: 'project_manager',
                    position: { x: 100, y: 200 }
                },
                {
                    id: 'budget_review',
                    type: 'task',
                    name: 'Budget Review',
                    description: 'Review project budget and financial requirements',
                    role: 'finance',
                    position: { x: 100, y: 300 }
                },
                {
                    id: 'technical_review',
                    type: 'task',
                    name: 'Technical Review',
                    description: 'Assess technical feasibility and requirements',
                    role: 'technical_lead',
                    position: { x: 300, y: 300 }
                },
                {
                    id: 'decision',
                    type: 'decision',
                    name: 'Approval Decision',
                    description: 'Make final approval decision',
                    role: 'director',
                    position: { x: 200, y: 400 }
                },
                {
                    id: 'approved',
                    type: 'end',
                    name: 'Project Approved',
                    description: 'Project has been approved for execution',
                    position: { x: 100, y: 500 }
                },
                {
                    id: 'rejected',
                    type: 'end',
                    name: 'Project Rejected',
                    description: 'Project proposal has been rejected',
                    position: { x: 300, y: 500 }
                }
            ],
            edges: [
                { id: 'e1', from: 'start', to: 'initial_review' },
                { id: 'e2', from: 'initial_review', to: 'budget_review' },
                { id: 'e3', from: 'initial_review', to: 'technical_review' },
                { id: 'e4', from: 'budget_review', to: 'decision' },
                { id: 'e5', from: 'technical_review', to: 'decision' },
                { id: 'e6', from: 'decision', to: 'approved', condition: 'approved' },
                { id: 'e7', from: 'decision', to: 'rejected', condition: 'rejected' }
            ],
            variables: {
                project_name: { type: 'string', required: true },
                budget: { type: 'number', required: true },
                duration: { type: 'string', required: true },
                priority: { type: 'enum', values: ['low', 'medium', 'high', 'critical'], default: 'medium' }
            }
        });

        const procedures = [customerOnboardingProcedure, projectApprovalProcedure];

        for (const procedure of procedures) {
            await db.create('procedure_templates', {
                ...procedure.toJSON(),
                nodes: JSON.stringify(procedure.nodes),
                edges: JSON.stringify(procedure.edges),
                tags: JSON.stringify(procedure.tags),
                variables: JSON.stringify(procedure.variables),
                settings: JSON.stringify(procedure.settings)
            });
            console.log(`Created procedure template: ${procedure.name}`);
        }

        console.log('\n✅ Database seeding completed successfully!');
        console.log('\nSample accounts created:');
        console.log('Email: john@example.com, Password: password123 (Admin at Acme Corp)');
        console.log('Email: jane@example.com, Password: password123 (Admin at Global Solutions)');
        console.log('Email: alice@example.com, Password: password123 (Admin at Startup Ventures)');
        console.log('Email: bob@example.com, Password: password123 (Worker at Acme Corp)');

        console.log('\nOrganizations created:');
        organizations.forEach(org => {
            console.log(`- ${org.display_name} (${org.name})`);
        });

        console.log('\nProcedure templates created:');
        procedures.forEach(proc => {
            console.log(`- ${proc.name} (${proc.category})`);
        });

    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    } finally {
        await db.close();
    }
}

// Run the seeder if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDatabase().catch(error => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
}

export { seedDatabase };