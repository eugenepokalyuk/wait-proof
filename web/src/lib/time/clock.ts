// Смещение часов телефона относительно сервера. Таймер считается от
// started_at сервера: если часы телефона спешат на минуту, без поправки
// «ждёт уже» показывало бы лишнюю минуту и спор начинался бы заново.
let offset = 0;

export const setServerTime = (iso: string) => {
  const server = Date.parse(iso);
  if (!Number.isNaN(server)) offset = server - Date.now();
};

export const serverNow = () => Date.now() + offset;
