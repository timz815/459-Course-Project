import { forwardRef } from "react";
import "../../styles/Button.css";

const Button = forwardRef(function Button(
  {
    as: Component = "button",
    variant = "primary",
    size,
    headIcon,
    tailIcon,
    className,
    children,
    ...rest
  },
  ref,
) {
  const classes = [
    "ui-btn",
    `ui-btn-${variant}`,
    size === "small" ? "ui-btn-sm" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component ref={ref} className={classes} {...rest}>
      {headIcon && <span className="ui-btn-icon">{headIcon}</span>}
      {children}
      {tailIcon && <span className="ui-btn-icon">{tailIcon}</span>}
    </Component>
  );
});

export default Button;
