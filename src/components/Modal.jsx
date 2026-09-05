export default function Modal({ open, onClose, children, className = "" }) {
  return <div className={`readme_modal_overlay ${open ? "active" : ""}`} onClick={(event) => event.target === event.currentTarget && onClose()}>
    <div className={`readme_modal_content ${className}`}>{children}</div>
  </div>;
}
