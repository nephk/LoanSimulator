import { useCallback, useState } from 'react';

export function usePrincipalInput(initialValue: number) {
  const [value, setValue] = useState(() => {
    const n = Number(initialValue);
    return Number.isFinite(n) && n !== 0 ? n.toLocaleString('ja-JP') : String(initialValue);
  });
  const onChange = useCallback((nextValue: string) => setValue(nextValue), []);
  const onFocus = useCallback(() => setValue((current) => current.replace(/,/g, '')), []);
  const onBlur = useCallback(() => {
    setValue((current) => {
      const number = Number(current.replace(/,/g, ''));
      if (!Number.isFinite(number) || number === 0) return current;
      return number.toLocaleString('ja-JP');
    });
  }, []);
  return { value, onChange, onFocus, onBlur };
}
