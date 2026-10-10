import React from "react";
import { Shield, Users, UserCog } from "lucide-react";

export default function RolePermissionSelector({ value = [], onChange }) {
  const roles = [
    { id: 'admin', label: 'Admin', desc: 'Acesso total', icon: Shield },
    { id: 'user', label: 'User', desc: 'Usuário padrão', icon: Users },
    { id: 'medico', label: 'Médico', desc: 'Portal médico', icon: UserCog },
    { id: 'paciente', label: 'Paciente', desc: 'Portal paciente', icon: UserCog }
  ];

  const toggleRole = (roleId) => {
    const newRoles = value.includes(roleId)
      ? value.filter(r => r !== roleId)
      : [...value, roleId];
    onChange(newRoles);
  };

  return (
    <div className="space-y-2">
      {roles.map(role => {
        const Icon = role.icon;
        const isSelected = value.includes(role.id);
        return (
          <button
            key={role.id}
            onClick={() => toggleRole(role.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
              isSelected 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isSelected ? 'bg-purple-600' : 'bg-gray-100'
            }`}>
              <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">{role.label}</p>
              <p className="text-xs text-gray-500">{role.desc}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
            }`}>
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}