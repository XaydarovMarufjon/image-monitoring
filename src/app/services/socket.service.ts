import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
    socket = io('http://localhost:3000');

    onProgress(cb: (data: any) => void) {
        this.socket.on('scan-progress', cb);
    }
}