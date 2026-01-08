const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { firstName: { contains: 'test', mode: 'insensitive' } },
                { lastName: { contains: 'test', mode: 'insensitive' } },
                { email: { contains: 'test', mode: 'insensitive' } }
            ]
        }
    });

    console.log('Found users:', users.length);

    for (const user of users) {
        console.log(`User: ${user.firstName} ${user.lastName} (${user.email}) - Status: ${user.status}`);

        if (user.status !== 'ACTIVE') {
            console.log('Activating...');
            await prisma.user.update({
                where: { id: user.id },
                data: { status: 'ACTIVE' }
            });
            console.log('Activated.');
        } else {
            console.log('Already Active.');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
