'use client';

import { useState } from 'react';
import { waLink, WA_DEFAULT_MESSAGE } from '@/lib/contact';
import { Icon, WhatsAppIcon } from './Icon';

export function FloatingWhatsApp({ doctorPhone, assistantPhone }: { doctorPhone: string; assistantPhone: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="wa-float">
      {open && (
        <div className="wa-menu" role="menu">
          <a role="menuitem" href={waLink(doctorPhone, WA_DEFAULT_MESSAGE)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={18} /> WhatsApp Doctor
          </a>
          <a role="menuitem" href={waLink(assistantPhone, WA_DEFAULT_MESSAGE)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={18} /> WhatsApp Assistant
          </a>
        </div>
      )}
      <button
        type="button"
        className="wa-btn"
        aria-label={open ? 'Close WhatsApp options' : 'Chat with us on WhatsApp'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <Icon name="close" size={24} /> : <WhatsAppIcon size={28} />}
      </button>
    </div>
  );
}
