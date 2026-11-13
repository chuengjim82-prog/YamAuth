import { InputNumber, type InputNumberProps } from 'antd'
import type { IntegerInputValue } from '@/resources/formValues'

type IntegerInputProps = Omit<
  InputNumberProps<string>,
  'value' | 'defaultValue' | 'onChange' | 'stringMode'
> & {
  value?: IntegerInputValue
  onChange?: (value: string | null) => void
}

export default function IntegerInput({ value, onChange, ...props }: IntegerInputProps) {
  return (
    <InputNumber<string>
      {...props}
      stringMode
      value={value == null ? null : String(value)}
      onChange={(next) => onChange?.(next)}
    />
  )
}
