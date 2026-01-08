import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
    private readonly appName: string;

    constructor(private configService: ConfigService) {
        this.appName = 'Attendance SaaS';
    }

    generateSecret(email: string): { secret: string; otpAuthUrl: string } {
        const secret = authenticator.generateSecret();
        const otpAuthUrl = authenticator.keyuri(email, this.appName, secret);

        return { secret, otpAuthUrl };
    }

    async generateQRCode(otpAuthUrl: string): Promise<string> {
        return QRCode.toDataURL(otpAuthUrl, {
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });
    }

    verifyToken(secret: string, token: string): boolean {
        return authenticator.verify({ token, secret });
    }
}
