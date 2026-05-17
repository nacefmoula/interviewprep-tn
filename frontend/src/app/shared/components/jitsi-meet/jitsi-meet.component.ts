import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';

declare global {
    interface Window {
        JitsiMeetExternalAPI?: any;
    }
}

@Component({
    selector: 'app-jitsi-meet',
    standalone: true,
    template: `
    <div class="jitsi-host" #host></div>
  `,
    styles: [
        `
      .jitsi-host {
        width: 100%;
        height: 600px;
        border-radius: 12px;
        overflow: hidden;
      }
    `
    ]
})
export class JitsiMeetComponent implements AfterViewInit, OnDestroy {
    @Input({ required: true }) roomName!: string;
    @Input() displayName?: string;

    @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

    private api: any;

    async ngAfterViewInit() {
        await this.ensureScriptLoaded();

        const roomName = (this.roomName || '').trim();
        if (!roomName) return;

        this.api = new window.JitsiMeetExternalAPI('meet.jit.si', {
            roomName,
            parentNode: this.host.nativeElement,
            userInfo: {
                displayName: this.displayName || 'User'
            },
            configOverwrite: {
                prejoinPageEnabled: true
            }
        });
    }

    ngOnDestroy() {
        if (this.api) {
            this.api.dispose();
            this.api = null;
        }
    }

    private ensureScriptLoaded(): Promise<void> {
        if (window.JitsiMeetExternalAPI) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-jitsi="external_api"]');
            if (existing) {
                existing.addEventListener('load', () => resolve());
                existing.addEventListener('error', () => reject(new Error('Failed to load Jitsi script')));
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            script.dataset['jitsi'] = 'external_api';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Jitsi script'));
            document.body.appendChild(script);
        });
    }
}
