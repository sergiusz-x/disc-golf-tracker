"use client";

import QRCode from "react-qr-code";

export function QrCode({ value }: { value: string }) {
    return (
        <QRCode
            value={value}
            size={148}
            className="rounded-lg bg-white p-3"
        />
    );
}
