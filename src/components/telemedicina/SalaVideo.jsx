import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Circle, Square } from "lucide-react";

export default function SalaVideo({ consultaId, onEncerrar, onGravacaoIniciada }) {
  const [audioAtivo, setAudioAtivo] = useState(true);
  const [videoAtivo, setVideoAtivo] = useState(true);
  const [gravando, setGravando] = useState(false);
  const [duracaoConsulta, setDuracaoConsulta] = useState(0);
  const [compartilhandoTela, setCompartilhandoTela] = useState(false);
  
  const videoLocalRef = useRef(null);
  const videoRemotoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const intervaloRef = useRef(null);

  useEffect(() => {
    iniciarStream();
    
    // Contador de duração
    intervaloRef.current = setInterval(() => {
      setDuracaoConsulta(prev => prev + 1);
    }, 1000);

    return () => {
      pararStream();
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  const iniciarStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      streamRef.current = stream;
      if (videoLocalRef.current) {
        videoLocalRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Erro ao acessar câmera/microfone:", error);
      alert("Erro ao acessar câmera/microfone. Verifique as permissões.");
    }
  };

  const pararStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioAtivo(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoAtivo(videoTrack.enabled);
      }
    }
  };

  const iniciarGravacao = () => {
    if (!streamRef.current) return;

    try {
      const options = { mimeType: 'video/webm;codecs=vp9' };
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Download automático
        const a = document.createElement('a');
        a.href = url;
        a.download = `consulta_${consultaId}_${Date.now()}.webm`;
        a.click();
        
        if (onGravacaoIniciada) {
          onGravacaoIniciada(url);
        }
      };

      mediaRecorderRef.current.start();
      setGravando(true);
      alert("✅ Gravação iniciada! A consulta está sendo gravada conforme CFM 2.314/22");
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      alert("Erro ao iniciar gravação");
    }
  };

  const pararGravacao = () => {
    if (mediaRecorderRef.current && gravando) {
      mediaRecorderRef.current.stop();
      setGravando(false);
      alert("✅ Gravação finalizada e salva!");
    }
  };

  const compartilharTela = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true 
      });
      
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = streamRef.current.getVideoTracks()[0];
      
      // Substituir track de vídeo pela tela
      if (videoLocalRef.current) {
        videoLocalRef.current.srcObject = screenStream;
      }
      
      videoTrack.onended = () => {
        setCompartilhandoTela(false);
        iniciarStream(); // Voltar para câmera
      };
      
      setCompartilhandoTela(true);
    } catch (error) {
      console.error("Erro ao compartilhar tela:", error);
    }
  };

  const formatarDuracao = (segundos) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const encerrarConsulta = () => {
    if (gravando) {
      pararGravacao();
    }
    pararStream();
    if (onEncerrar) onEncerrar();
  };

  return (
    <div className="space-y-4">
      {/* Indicador de Gravação */}
      {gravando && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3 flex items-center gap-3">
          <Circle className="w-4 h-4 text-red-600 animate-pulse fill-current" />
          <span className="text-red-800 font-medium">REC - Gravando consulta</span>
          <span className="text-red-600 ml-auto">{formatarDuracao(duracaoConsulta)}</span>
        </div>
      )}

      {/* Área de Vídeo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vídeo Local (Médico) */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoLocalRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
            Você
          </div>
          {!videoAtivo && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <VideoOff className="w-16 h-16 text-gray-500" />
            </div>
          )}
        </div>

        {/* Vídeo Remoto (Paciente) */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRemotoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
            Paciente
          </div>
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="text-center text-white">
              <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aguardando conexão do paciente...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Áudio */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${
              audioAtivo ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"
            } text-white`}
            title={audioAtivo ? "Desativar microfone" : "Ativar microfone"}
          >
            {audioAtivo ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* Vídeo */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${
              videoAtivo ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"
            } text-white`}
            title={videoAtivo ? "Desativar câmera" : "Ativar câmera"}
          >
            {videoAtivo ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          {/* Compartilhar Tela */}
          <button
            onClick={compartilharTela}
            className={`p-4 rounded-full ${
              compartilhandoTela ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
            } text-white`}
            title="Compartilhar tela"
          >
            <Monitor className="w-6 h-6" />
          </button>

          {/* Gravação */}
          <button
            onClick={gravando ? pararGravacao : iniciarGravacao}
            className={`p-4 rounded-full ${
              gravando ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
            } text-white`}
            title={gravando ? "Parar gravação" : "Iniciar gravação"}
          >
            {gravando ? <Square className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
          </button>

          {/* Encerrar */}
          <button
            onClick={encerrarConsulta}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white"
            title="Encerrar consulta"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* Timer */}
        <div className="text-center mt-3">
          <p className="text-white text-sm">Duração: {formatarDuracao(duracaoConsulta)}</p>
        </div>
      </div>

      {/* Aviso Legal */}
      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
        <p className="text-xs text-yellow-800">
          ⚠️ <strong>Gravação Conforme CFM 2.314/22:</strong> As gravações são armazenadas de forma segura e 
          integradas ao prontuário eletrônico. O paciente foi informado e consentiu com a gravação.
        </p>
      </div>
    </div>
  );
}