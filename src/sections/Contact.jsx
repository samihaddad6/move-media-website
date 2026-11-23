import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import bg from '../assets/img/contact-bg.webp';
import body from '../assets/img/car-body.webp';
import wheel from '../assets/img/car-wheel.webp';
import Magnet from '../components/rb/Magnet.jsx';
import { CONTACT } from '../content.js';
import { reduced, touch } from '../lib/motion.js';

// measured from the baked side view (860 x 365 px body layer)
const WHEELS = [
  [21.8, 82.7],
  [78.2, 82.7],
];
const WHEEL_W = (120 / 860) * 100; // wheel layer width, % of body
const WHEEL_R = 56.3 / 860; // tyre radius as a share of body width

const FIELDS = [
  { id: 'name', label: 'Name', type: 'text', auto: 'name', required: true },
  { id: 'company', label: 'Company', type: 'text', auto: 'organization' },
  { id: 'email', label: 'Email', type: 'email', auto: 'email', required: true },
  { id: 'phone', label: 'Phone', type: 'tel', auto: 'tel' },
];

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Please enter your name.';
  if (!v.email.trim()) e.email = 'Please enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Please enter a valid email address, for example name@company.com.';
  if (v.phone && !/^[+\d][\d\s()-]{5,}$/.test(v.phone.trim())) e.phone = 'Please enter a valid phone number, or leave it empty.';
  if (!v.message.trim()) e.message = 'Please tell us a little about your campaign.';
  return e;
}

export default function Contact() {
  const root = useRef(null);
  const [values, setValues] = useState({ name: '', company: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [sent, setSent] = useState(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef(null);

  // the taxi pulls up and parks as the visitor arrives
  useEffect(() => {
    const el = root.current;
    const car = el.querySelector('.park__car');
    const bodyEl = el.querySelector('.park__body');
    const wheels = Array.from(el.querySelectorAll('.park__wheel'));
    if (reduced) return undefined;
    const state = { x: -2.4, pitch: 0 };
    let lastX = state.x, angle = 0;
    const apply = () => {
      const w = car.offsetWidth;
      const dx = (state.x - lastX) * w;
      lastX = state.x;
      angle += (dx / (WHEEL_R * w)) * (180 / Math.PI);
      car.style.transform = `translate3d(${(state.x * 100).toFixed(2)}%, 0, 0)`;
      wheels.forEach((k) => (k.style.transform = `translate(-50%, -50%) rotate(${angle.toFixed(1)}deg)`));
      bodyEl.style.transform = `rotate(${state.pitch.toFixed(3)}deg)`;
    };
    apply();
    const tl = gsap.timeline({ paused: true });
    tl.to(state, {
      x: 0,
      duration: 2.6,
      ease: 'power3.out',
      onUpdate() {
        const t = this.progress();
        // braking load: the nose dips while the car slows, then the body settles
        state.pitch = 0.9 * (1 - t) * Math.min(1, t * 6);
        apply();
      },
    }).to(state, { keyframes: [{ pitch: -0.32, duration: 0.22, ease: 'sine.out' }, { pitch: 0.1, duration: 0.24, ease: 'sine.inOut' }, { pitch: 0, duration: 0.3, ease: 'sine.out' }], onUpdate: apply });
    const st = ScrollTrigger.create({ trigger: el.querySelector('.park'), start: 'top 62%', once: true, onEnter: () => tl.play() });
    return () => {
      st.kill();
      tl.kill();
    };
  }, []);

  const change = (e) => {
    const v = { ...values, [e.target.name]: e.target.value };
    setValues(v);
    if (touched[e.target.name]) setErrors(validate(v));
  };
  const blur = (e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validate(values));
  };
  const submit = (e) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    setTouched({ name: true, email: true, phone: true, message: true });
    const first = Object.keys(errs)[0];
    if (first) return formRef.current.querySelector(`#f-${first}`).focus();
    const subject = `Move Media enquiry from ${values.name.trim()}${values.company.trim() ? `, ${values.company.trim()}` : ''}`;
    const lines = [`Name: ${values.name.trim()}`, values.company.trim() && `Company: ${values.company.trim()}`, `Email: ${values.email.trim()}`, values.phone.trim() && `Phone: ${values.phone.trim()}`, '', values.message.trim()].filter((l) => l !== false && l !== '');
    const bodyText = lines.join('\n');
    const href = `mailto:${CONTACT.email.value}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    // open the visitor's email app with the message filled in; the page also keeps the text to copy
    const a = document.createElement('a');
    a.href = href;
    a.rel = 'noopener';
    document.body.appendChild(a);
    try {
      a.click();
    } catch {}
    a.remove();
    setCopied(false);
    setSent({ href, text: `${subject}\n\n${bodyText}` });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sent.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const err = (id) => touched[id] && errors[id];

  return (
    <section id="contact" ref={root} className="contact" aria-labelledby="contact-title">
      <div className="park" aria-hidden="true">
        <img className="park__bg" src={bg} alt="" width="1600" height="889" loading="lazy" decoding="async" />
        <div className="park__lane">
          <div className="park__car">
            <div className="park__body">
              <img src={body} alt="" width="860" height="365" />
              {WHEELS.map(([x, y], i) => (
                <img key={i} className="park__wheel" src={wheel} alt="" width="120" height="120" style={{ left: `${x}%`, top: `${y}%`, width: `${WHEEL_W}%` }} />
              ))}
            </div>
            <div className="park__mirror">
              <img src={body} alt="" width="860" height="365" />
            </div>
          </div>
        </div>
      </div>

      <div className="contact__grid">
        <div className="contact__intro">
          <h2 id="contact-title" className="contact__title">
            {CONTACT.title}
          </h2>
          <p className="contact__text">{CONTACT.text}</p>
          <dl className="contact__details">
            <div>
              <dt>Email</dt>
              <dd className="ph-text">{CONTACT.email.shown}</dd>
            </div>
            <div>
              <dt>Phone or WhatsApp</dt>
              <dd className="ph-text">{CONTACT.phone.shown}</dd>
            </div>
            <div>
              <dt>Instagram</dt>
              <dd className="ph-text">{CONTACT.instagram.shown}</dd>
            </div>
          </dl>
        </div>

        <div className="contact__form-wrap">
          {sent ? (
            <div className="sent" role="status">
              <h3>Your message is ready.</h3>
              <p>
                We tried to open your email app with your message filled in. If it did not open, copy the message and send it to us at <span className="ph-text">{CONTACT.email.shown}</span>.
              </p>
              <pre className="sent__msg">{sent.text}</pre>
              <div className="sent__actions">
                <a className="btn" href={sent.href}>
                  Open in email app
                </a>
                <button type="button" className="btn btn--ghost" onClick={copy}>
                  {copied ? 'Copied' : 'Copy message'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setSent(null)}>
                  Edit message
                </button>
              </div>
            </div>
          ) : (
            <form ref={formRef} className="form" noValidate onSubmit={submit}>
              <div className="form__row">
                {FIELDS.map((f) => (
                  <div key={f.id} className={`field${err(f.id) ? ' is-error' : ''}`}>
                    <label htmlFor={`f-${f.id}`}>
                      {f.label}
                      {!f.required && <span className="field__opt"> (optional)</span>}
                    </label>
                    <input id={`f-${f.id}`} name={f.id} type={f.type} autoComplete={f.auto} value={values[f.id]} onChange={change} onBlur={blur} aria-invalid={!!err(f.id)} aria-describedby={err(f.id) ? `e-${f.id}` : undefined} required={f.required} />
                    {err(f.id) && (
                      <p id={`e-${f.id}`} className="field__error">
                        {errors[f.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className={`field field--message${err('message') ? ' is-error' : ''}`}>
                <label htmlFor="f-message">Message</label>
                <textarea id="f-message" name="message" rows="5" value={values.message} onChange={change} onBlur={blur} aria-invalid={!!err('message')} aria-describedby={err('message') ? 'e-message' : undefined} required />
                {err('message') && (
                  <p id="e-message" className="field__error">
                    {errors.message}
                  </p>
                )}
              </div>
              <div className="form__foot">
                <Magnet padding={50} magnetStrength={5} maxOffset={10} disabled={touch || reduced}>
                  <button type="submit" className="btn btn--large">
                    Send message
                  </button>
                </Magnet>
                <p className="form__note">This opens your email app with your message filled in.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
