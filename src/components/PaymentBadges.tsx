// Payment-method badges shown in the footer to indicate accepted payments.
// Simplified, recognizable marks in each brand's colors (nominative use), on
// white cards so they read the same in light and dark themes.

function Card({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="inline-flex h-7 w-11 items-center justify-center rounded-[4px] border border-black/10 bg-white shadow-sm"
    >
      {children}
    </span>
  );
}

function Visa() {
  return (
    <Card label="Visa">
      <span className="text-[10px] font-bold italic tracking-tight text-[#1A1F71]">VISA</span>
    </Card>
  );
}

function Mastercard() {
  return (
    <Card label="Mastercard">
      <svg width="26" height="17" viewBox="0 0 26 17" aria-hidden="true">
        <circle cx="10" cy="8.5" r="6.5" fill="#EB001B" />
        <circle cx="16" cy="8.5" r="6.5" fill="#F79E1B" />
        <path d="M13 3.3a6.5 6.5 0 0 0 0 10.4 6.5 6.5 0 0 0 0-10.4z" fill="#FF5F00" />
      </svg>
    </Card>
  );
}

function Elo() {
  return (
    <Card label="Elo">
      <span className="text-[10px] font-extrabold lowercase text-[#111]">
        e<span className="text-[#EF4123]">l</span>
        <span className="text-[#00A4E0]">o</span>
      </span>
    </Card>
  );
}

function Amex() {
  return (
    <span
      role="img"
      aria-label="American Express"
      className="inline-flex h-7 w-11 items-center justify-center rounded-[4px] bg-[#1F72CD] shadow-sm"
    >
      <span className="text-[7px] font-bold leading-tight text-white">AMEX</span>
    </span>
  );
}

function Pix() {
  return (
    <Card label="Pix">
      <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
        <path
          fill="#32BCAD"
          d="M16 3.6l4.2 4.2a3 3 0 0 1-4.2 0l-.9-.9a1.4 1.4 0 0 0-2 0l-.9.9a3 3 0 0 1-4.2 0L16 3.6zm-8.4 8.4l2.6-2.6a3 3 0 0 1 0 4.2l-.9.9a1.4 1.4 0 0 0 0 2l.9.9a3 3 0 0 1 0 4.2L7.6 20a2 2 0 0 1 0-2.8l2.2-2.2a2 2 0 0 0 0-2.8L7.6 12zm16.8 0l-2.6 2.6a2 2 0 0 0 0 2.8l2.2 2.2a2 2 0 0 1 0 2.8l-2.6-2.6a3 3 0 0 1 0-4.2l.9-.9a1.4 1.4 0 0 0 0-2l-.9-.9a3 3 0 0 1 0-4.2zM16 28.4l-4.2-4.2a3 3 0 0 1 4.2 0l.9.9a1.4 1.4 0 0 0 2 0l.9-.9a3 3 0 0 1 4.2 0L16 28.4z"
        />
      </svg>
    </Card>
  );
}

function MercadoPago() {
  return (
    <span
      role="img"
      aria-label="Mercado Pago"
      className="inline-flex h-7 items-center justify-center gap-1 rounded-[4px] bg-[#009EE3] px-2 shadow-sm"
    >
      <svg width="16" height="12" viewBox="0 0 28 20" aria-hidden="true">
        <ellipse cx="14" cy="10" rx="12" ry="7.5" fill="#FFE600" />
        <path d="M8 10.5c1.5 1.6 3.2 2.4 6 2.4s4.5-.8 6-2.4c-1.2-.5-2-.9-3-.9-1.2 0-1.6.8-3 .8s-1.8-.8-3-.8c-1 0-1.8.4-3 .9z" fill="#009EE3" />
      </svg>
      <span className="text-[7px] font-semibold leading-tight text-white">Mercado&nbsp;Pago</span>
    </span>
  );
}

export function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Pix />
      <Visa />
      <Mastercard />
      <Elo />
      <Amex />
      <MercadoPago />
    </div>
  );
}
