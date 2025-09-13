'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useNotifications } from '@/contexts/NotificationContext'
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications'
import { TransferNotification } from './TransferNotification'
import { SystemNotification } from './SystemNotification'

export function NotificationDisplay() {
  const { notifications, removeNotification, markAsRead } = useNotifications()
  
  // Автоматически подключаемся к SSE
  useRealTimeNotifications()

  // Показываем только последние 3 уведомления для избежания перегрузки UI
  const visibleNotifications = notifications.slice(0, 3)

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      {/* Safe area с правильным отступом сверху */}
      <div className="pt-safe space-y-2 p-4">
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((notification, index) => {
            const style = {
              '--index': index,
              zIndex: 100 - index,
              pointerEvents: 'auto' as const,
              // Сдвигаем вниз каждое последующее уведомление
              transform: `translateY(${index * 10}px)`,
              opacity: 1 - index * 0.1
            }

            if (notification.type === 'transfer_received') {
              return (
                <motion.div 
                  key={notification.id} 
                  style={style}
                  layout
                >
                  <TransferNotification
                    notification={notification}
                    onClose={() => removeNotification(notification.id)}
                    onMarkAsRead={() => markAsRead(notification.id)}
                  />
                </motion.div>
              )
            } else {
              return (
                <motion.div 
                  key={notification.id} 
                  style={style}
                  layout
                >
                  <SystemNotification
                    notification={notification}
                    onClose={() => removeNotification(notification.id)}
                  />
                </motion.div>
              )
            }
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
