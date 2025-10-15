export default function handler(req, res) {
  // Временно отключаем автодеплой на 22 часа
  const disableUntil = new Date();
  disableUntil.setHours(disableUntil.getHours() + 22);
  
  res.status(200).json({
    message: 'Автодеплой временно отключен',
    disabledUntil: disableUntil.toISOString(),
    note: 'Для включения автодеплоя удалите этот файл'
  });
}
