/**
 * Componente de botón reutilizable para SCREENREC
 */

export type ButtonVariant = "primary" | "danger" | "secondary";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  children: string | HTMLElement;
  onClick?: () => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

const buttonClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  danger: "btn-danger",
  secondary: "btn-secondary",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export class Button {
  private element: HTMLButtonElement;

  constructor(props: ButtonProps) {
    this.element = document.createElement("button");
    this.updateProps(props);
  }

  private updateProps(props: ButtonProps): void {
    const {
      variant = "primary",
      size = "md",
      disabled = false,
      loading = false,
      children,
      onClick,
      className = "",
      id,
      ariaLabel,
    } = props;

    // Clases base
    this.element.className = `btn ${buttonClasses[variant]} ${buttonSizes[size]} ${className}`;

    // Atributos
    if (id) this.element.id = id;
    if (ariaLabel) this.element.setAttribute("aria-label", ariaLabel);
    if (disabled || loading) this.element.disabled = true;

    // Contenido
    this.element.innerHTML = "";
    if (loading) {
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      spinner.innerHTML = "⏳"; // Podría ser un SVG en producción
      this.element.appendChild(spinner);
    }
    if (typeof children === "string") {
      this.element.textContent = children;
    } else {
      this.element.appendChild(children);
    }

    // Event listeners
    if (onClick && !disabled && !loading) {
      this.element.addEventListener("click", onClick);
    }
  }

  public getElement(): HTMLButtonElement {
    return this.element;
  }

  public setDisabled(disabled: boolean): void {
    this.element.disabled = disabled;
  }

  public setLoading(loading: boolean): void {
    this.element.disabled = loading;
    if (loading) {
      this.element.innerHTML = "⏳ Cargando...";
    }
  }

  public setText(text: string): void {
    this.element.textContent = text;
  }

  public destroy(): void {
    this.element.remove();
  }
}
