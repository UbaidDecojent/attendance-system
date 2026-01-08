const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedLeaveTypes() {
    const userEmail = process.argv[2]; // Admin email to find company

    if (!userEmail) {
        console.log('Usage: node seed-leave-types.js <admin-email>');
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user || !user.companyId) {
            console.log('User or company not found');
            process.exit(1);
        }

        const companyId = user.companyId;

        const defaultLeaveTypes = [
            {
                name: 'Annual Leave',
                code: 'AL',
                description: 'Regular annual leave',
                color: '#4F46E5', // Indigo
                defaultDays: 14,
                maxDays: 20,
                isPaid: true
            },
            {
                name: 'Sick Leave',
                code: 'SL',
                description: 'Medical or sick leave',
                color: '#DC2626', // Red
                defaultDays: 10,
                maxDays: 15,
                isPaid: true
            },
            {
                name: 'Casual Leave',
                code: 'CL',
                description: 'Casual or personal leave',
                color: '#059669', // Emerald
                defaultDays: 7,
                maxDays: 10,
                isPaid: true
            },
            {
                name: 'Unpaid Leave',
                code: 'UL',
                description: 'Leave without pay',
                color: '#6B7280', // Gray
                defaultDays: 0,
                maxDays: 365,
                isPaid: false
            }
        ];

        console.log(`Seeding leave types for company ID: ${companyId}`);

        for (const type of defaultLeaveTypes) {
            await prisma.leaveType.upsert({
                where: {
                    companyId_code: {
                        companyId,
                        code: type.code,
                    },
                },
                update: {},
                create: {
                    companyId,
                    ...type,
                },
            });
            console.log(`Processed: ${type.name}`);
        }

        console.log('✅ Leave types seeded successfully');

    } catch (error) {
        console.error('Error seeding leave types:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedLeaveTypes();
