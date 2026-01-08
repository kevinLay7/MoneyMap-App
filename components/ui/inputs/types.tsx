export interface BaseInputProps {
  readonly icon: string;
  readonly label: string;
  readonly iconAlign?: 'left' | 'center';
  readonly error?: string;
  readonly infoText?: string;
  readonly required?: boolean;
}
