import { domMax } from 'framer-motion';

// Отдельный модуль ради динамического импорта: drag и layout-анимации
// (~25 КБ) догружаются после первого экрана и не входят в стартовый бандл.
export default domMax;
