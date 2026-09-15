import { Button } from '@/components/ui';
import { Routes } from '@/utils/consts';

export default function NotFound() {
  return (
    <div style={{ display: 'grid', gap: 16, paddingTop: 64, textAlign: 'center' }}>
      <h1>Такой страницы нет</h1>
      <Button href={Routes.Home}>На главную</Button>
    </div>
  );
}
