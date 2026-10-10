import { lazy } from 'react';

// === PRONTUÁRIOS (modais pesados) ===
export const TemplatesProntuario = lazy(() => import('@/components/prontuario/TemplatesProntuario'));
export const HistoricoEdicoes = lazy(() => import('@/components/prontuario/HistoricoEdicoes'));
export const CompartilhamentoSeguro = lazy(() => import('@/components/prontuario/CompartilhamentoSeguro'));
export const AssinaturaDigital = lazy(() => import('@/components/prontuario/AssinaturaDigital'));
export const IADiagnostico = lazy(() => import('@/components/prontuario/IADiagnostico'));
export const PrescricaoIA = lazy(() => import('@/components/prontuario/PrescricaoIA'));
export const AnaliseInteracoes = lazy(() => import('@/components/prontuario/AnaliseInteracoes'));

// === COMPLIANCE ===
export const ModalTermoLegal = lazy(() => import('@/components/compliance/ModalTermoLegal'));
export const ChecklistCompliance = lazy(() => import('@/components/compliance/ChecklistCompliance'));
export const UploadCertidaoAprimorado = lazy(() => import('@/components/compliance/UploadCertidaoAprimorado'));

// === IMPORTAÇÃO ===
export const ImportadorCSV = lazy(() => import('@/components/importacao/ImportadorCSV'));

// === CHAT/WIDGET ===
export const WidgetChatIA = lazy(() => import('@/components/chat/WidgetChatIA'));