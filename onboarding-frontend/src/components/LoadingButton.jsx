export default function LoadingButton({
  loading,
  children,
  className = "btn btn-primary",
  disabled,
  type = "button",
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      className={className}
      disabled={loading || disabled}
      onClick={onClick}
      {...rest}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}
