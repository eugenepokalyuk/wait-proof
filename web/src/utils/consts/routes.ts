export enum Routes {
  Home = '/',
  Login = '/login/',
  Timer = '/timer/',
  TimerHistory = '/timer/history/',
  TimerSettings = '/timer/settings/',
  Friends = '/friends/',
  Invite = '/invite/',
  Profile = '/profile/',
  Install = '/install/',
}

// id в query, а не в пути: статический экспорт не знает id таймеров на
// этапе сборки и не может нагенерировать под них страницы.
export const timerRoute = (id: number) => `${Routes.Timer}?id=${id}`;
export const timerHistoryRoute = (id: number) =>
  `${Routes.TimerHistory}?id=${id}`;
export const timerSettingsRoute = (id: number) =>
  `${Routes.TimerSettings}?id=${id}`;
