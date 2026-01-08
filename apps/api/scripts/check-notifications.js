const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('--- Checking Notifications ---');
        const count = await prisma.notification.count();
        console.log(`Total Notifications: ${count}`);

        const notifications = await prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { user: { select: { email: true, role: true } } }
        });

        if (notifications.length === 0) {
            console.log('No notifications found.');
        } else {
            notifications.forEach(n => {
                console.log(`[${n.createdAt.toISOString()}] To UserID: ${n.userId} | Email: ${n.user.email} | Type: ${n.type} | Read: ${n.isRead}`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
