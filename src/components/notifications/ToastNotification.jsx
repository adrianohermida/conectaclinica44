import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Mail, MessageSquare, CheckCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ToastNotification({ notification, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const iconMap = {
    novo_ticket: Bell,
    resposta_ticket: MessageSquare,
    novo_email: Mail,
    resposta_email: Mail,
    status_email: CheckCircle
  };

  const colorMap = {
    novo_ticket: '#ea4335',
    resposta_ticket: '#7E57FF',
    novo_email: '#0B7A9E',
    resposta_email: '#7E57FF',
    status_email: '#34a853'
  };

  const Icon = iconMap[notification.tipo] || Bell;
  const color = colorMap[notification.tipo] || '#7E57FF';

  const handleClick = () => {
    if (notification.link) {
      navigate(notification.link);
      onDismiss();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="bg-white rounded-2xl shadow-2xl border p-4 cursor-pointer hover:shadow-xl transition-all min-w-[320px] max-w-md"
          style={{ borderColor: '#e8eaed' }}
          onClick={handleClick}
        >
          <div className="flex items-start gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-1" style={{ color: '#202124' }}>
                {notification.titulo}
              </h4>
              <p className="text-xs line-clamp-2" style={{ color: '#5f6368' }}>
                {notification.corpo}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
                setTimeout(onDismiss, 300);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Dispensar notificação"
            >
              <X className="w-4 h-4" style={{ color: '#9aa0a6' }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}