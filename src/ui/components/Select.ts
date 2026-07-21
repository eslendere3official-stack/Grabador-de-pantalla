/**
 * Componente de select reutilizable para SCREENREC
 */

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id: string;
  label: string;
  options: SelectOption[];
  value?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

export class Select {
  private element: HTMLSelectElement;
  private labelElement: HTMLLabelElement;
  private container: HTMLDivElement;

  constructor(props: SelectProps) {
    this.container = document.createElement("div");
    this.container.className = `setting-group ${props.className || ""}`;

    // Crear label
    this.labelElement = document.createElement("label");
    this.labelElement.htmlFor = props.id;
    this.labelElement.textContent = props.label;
    this.labelElement.className = "select-label";

    // Crear select
    this.element = document.createElement("select");
    this.element.id = props.id;
    this.element.disabled = props.disabled || false;

    // Añadir opciones
    props.options.forEach((option) => {
      const optElement = document.createElement("option");
      optElement.value = option.value;
      optElement.textContent = option.label;
      if (option.value === props.value) {
        optElement.selected = true;
      }
      this.element.appendChild(optElement);
    });

    // Añadir event listener
    if (props.onChange) {
      this.element.addEventListener("change", () => {
        props.onChange!(this.element.value);
      });
    }

    // Ensamblar
    this.container.appendChild(this.labelElement);
    this.container.appendChild(this.element);
  }

  public getElement(): HTMLDivElement {
    return this.container;
  }

  public getValue(): string {
    return this.element.value;
  }

  public setValue(value: string): void {
    this.element.value = value;
  }

  public setDisabled(disabled: boolean): void {
    this.element.disabled = disabled;
  }

  public setOptions(options: SelectOption[]): void {
    this.element.innerHTML = "";
    options.forEach((option) => {
      const optElement = document.createElement("option");
      optElement.value = option.value;
      optElement.textContent = option.label;
      this.element.appendChild(optElement);
    });
  }

  public destroy(): void {
    this.container.remove();
  }
}
