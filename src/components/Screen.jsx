// A Move Media LED face. Shows only Move Media's own brand: logo, symbol or a short Move Media line.
import logo from '../assets/brand/movemedia-horizontal-colour-on-dark.svg';
import symbol from '../assets/brand/movemedia-symbol-orange.svg';

export function ScreenLogo({ className = '' }) {
  return (
    <div className={`scr-slide scr-slide--logo ${className}`}>
      <img src={logo} alt="" />
    </div>
  );
}
export function ScreenSymbol({ className = '' }) {
  return (
    <div className={`scr-slide scr-slide--symbol ${className}`}>
      <img src={symbol} alt="" />
    </div>
  );
}
export function ScreenLine({ text, className = '' }) {
  return (
    <div className={`scr-slide scr-slide--line ${className}`}>
      <img src={symbol} alt="" />
      <span>{text}</span>
    </div>
  );
}
