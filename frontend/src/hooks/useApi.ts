import { useState, useEffect } from "react";
import { apiClient, Aluno, Reuniao, Ocorrencia } from "../services/api";

// Hook customizado para gerenciar alunos com a API
export const useAlunos = () => {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getAlunos();
        setAlunos(data);
      } catch (err) {
        console.error("Erro ao carregar alunos:", err);
        setError("Erro ao carregar alunos");
      } finally {
        setLoading(false);
      }
    };

    fetchAlunos();
  }, []);

  const createAluno = async (aluno: Omit<Aluno, "id">) => {
    try {
      const novoAluno = await apiClient.createAluno(aluno);
      setAlunos([...alunos, novoAluno]);
      return novoAluno;
    } catch (err) {
      console.error("Erro ao criar aluno:", err);
      setError("Erro ao criar aluno");
      throw err;
    }
  };

  const updateAluno = async (id: number, aluno: Partial<Aluno>) => {
    try {
      const alunoAtualizado = await apiClient.updateAluno(id, aluno);
      setAlunos(alunos.map(a => (a.id === id ? alunoAtualizado : a)));
      return alunoAtualizado;
    } catch (err) {
      console.error("Erro ao atualizar aluno:", err);
      setError("Erro ao atualizar aluno");
      throw err;
    }
  };

  const deleteAluno = async (id: number) => {
    try {
      await apiClient.deleteAluno(id);
      setAlunos(alunos.filter(a => a.id !== id));
    } catch (err) {
      console.error("Erro ao deletar aluno:", err);
      setError("Erro ao deletar aluno");
      throw err;
    }
  };

  return {
    alunos,
    loading,
    error,
    createAluno,
    updateAluno,
    deleteAluno,
  };
};

// Hook customizado para gerenciar reuniões com a API
export const useReunioes = () => {
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReunioes = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getReunioes();
        setReunioes(data);
      } catch (err) {
        console.error("Erro ao carregar reuniões:", err);
        setError("Erro ao carregar reuniões");
      } finally {
        setLoading(false);
      }
    };

    fetchReunioes();
  }, []);

  const createReuniao = async (reuniao: Omit<Reuniao, "id">) => {
    try {
      const novaReuniao = await apiClient.createReuniao(reuniao);
      setReunioes([...reunioes, novaReuniao]);
      return novaReuniao;
    } catch (err) {
      console.error("Erro ao criar reunião:", err);
      setError("Erro ao criar reunião");
      throw err;
    }
  };

  const updateReuniao = async (id: number, reuniao: Partial<Reuniao>) => {
    try {
      const reuniaoAtualizada = await apiClient.updateReuniao(id, reuniao);
      setReunioes(reunioes.map(r => (r.id === id ? reuniaoAtualizada : r)));
      return reuniaoAtualizada;
    } catch (err) {
      console.error("Erro ao atualizar reunião:", err);
      setError("Erro ao atualizar reunião");
      throw err;
    }
  };

  const deleteReuniao = async (id: number) => {
    try {
      await apiClient.deleteReuniao(id);
      setReunioes(reunioes.filter(r => r.id !== id));
    } catch (err) {
      console.error("Erro ao deletar reunião:", err);
      setError("Erro ao deletar reunião");
      throw err;
    }
  };

  return {
    reunioes,
    loading,
    error,
    createReuniao,
    updateReuniao,
    deleteReuniao,
  };
};

// Hook customizado para gerenciar ocorrências com a API
export const useOcorrencias = () => {
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOcorrencias = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getOcorrencias();
        setOcorrencias(data);
      } catch (err) {
        console.error("Erro ao carregar ocorrências:", err);
        setError("Erro ao carregar ocorrências");
      } finally {
        setLoading(false);
      }
    };

    fetchOcorrencias();
  }, []);

  const createOcorrencia = async (ocorrencia: Omit<Ocorrencia, "id">) => {
    try {
      const novaOcorrencia = await apiClient.createOcorrencia(ocorrencia);
      setOcorrencias([...ocorrencias, novaOcorrencia]);
      return novaOcorrencia;
    } catch (err) {
      console.error("Erro ao criar ocorrência:", err);
      setError("Erro ao criar ocorrência");
      throw err;
    }
  };

  const updateOcorrencia = async (id: number, ocorrencia: Partial<Ocorrencia>) => {
    try {
      const ocorrenciaAtualizada = await apiClient.updateOcorrencia(id, ocorrencia);
      setOcorrencias(ocorrencias.map(o => (o.id === id ? ocorrenciaAtualizada : o)));
      return ocorrenciaAtualizada;
    } catch (err) {
      console.error("Erro ao atualizar ocorrência:", err);
      setError("Erro ao atualizar ocorrência");
      throw err;
    }
  };

  const deleteOcorrencia = async (id: number) => {
    try {
      await apiClient.deleteOcorrencia(id);
      setOcorrencias(ocorrencias.filter(o => o.id !== id));
    } catch (err) {
      console.error("Erro ao deletar ocorrência:", err);
      setError("Erro ao deletar ocorrência");
      throw err;
    }
  };

  return {
    ocorrencias,
    loading,
    error,
    createOcorrencia,
    updateOcorrencia,
    deleteOcorrencia,
  };
};
