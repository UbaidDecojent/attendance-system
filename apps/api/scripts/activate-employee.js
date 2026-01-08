// Script to activate employee and set password
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function activateEmployee() {
    const employeeEmail = process.argv[2];
    const newPassword = process.argv[3] || 'Employee@123!';

    if (!employeeEmail) {
        console.log('Usage: node activate-employee.js <email> [password]');
        console.log('Example: node activate-employee.js john@company.com MyPassword123!');
        process.exit(1);
    }

    try {
        // Find the user by email
        const user = await prisma.user.findUnique({
            where: { email: employeeEmail.toLowerCase() },
            include: { employee: true }
        });

        if (!user) {
            console.log(`❌ No user found with email: ${employeeEmail}`);
            process.exit(1);
        }

        console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`Current status: ${user.status}`);

        // Hash the new password
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Update the user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                status: 'ACTIVE',
                emailVerified: true,
            }
        });

        console.log('\n✅ Account activated successfully!');
        console.log('-----------------------------');
        console.log(`Email: ${employeeEmail}`);
        console.log(`Password: ${newPassword}`);
        console.log(`Status: ACTIVE`);
        console.log('-----------------------------');
        console.log('\nThe employee can now login at: http://localhost:3000/auth/login');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

activateEmployee();
