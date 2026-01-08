const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const email = 'ubaidlaghari2383@gmail.com';
    const user = await prisma.user.findUnique({ where: { email }, include: { employee: true } });

    if (!user || !user.employee) {
        console.log('User/Employee not found');
        return;
    }

    // IDs taken from previous debug output
    // Annual: 281f9056-ac9b-4b10-ba58-578e3d548fd9 -> 10
    // Casual: 1d0283d2-9464-438a-a34d-c049fbe7d2b4 -> 4

    const newBalances = {
        "1d0283d2-9464-438a-a34d-c049fbe7d2b4": 4,
        "281f9056-ac9b-4b10-ba58-578e3d548fd9": 10
    };

    await prisma.employee.update({
        where: { id: user.employee.id },
        data: { leaveBalances: newBalances }
    });
    console.log('Fixed balances for', email, ':', newBalances);
}

fix()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
