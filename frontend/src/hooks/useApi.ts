import { useCallback, useEffect, useState } from "react";
import {
  Aluno,
  AlunoCreate,
  AlunoUpdate,
  Ocorrencia,
  OcorrenciaCreate,
  OcorrenciaUpdate,
  Reuniao,
  ReuniaoCreate,
  ReuniaoUpdate,
  apiClient,
} from "../services/api";

export const useAlunos = () => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAlunos(await apiClient.getAlunos());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar alunos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createAluno = async (aluno: AlunoCreate) => {
    const novoAluno = await apiClient.createAluno(aluno);
    await reload();
    return novoAluno;
  };

  const updateAluno = async (id: number, aluno: AlunoUpdate) => {
    const alunoAtualizado = await apiClient.updateAluno(id, aluno);
    await reload();
    return alunoAtualizado;
  };

  const deleteAluno = async (id: number) => {
    const alunoRemovido = await apiClient.deleteAluno(id);
    await reload();
    return alunoRemovido;
  };

  return { alunos, loading, error, reload, createAluno, updateAluno, deleteAluno };
};

export const useReunioes = () => {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setReunioes(await apiClient.getReunioes());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar reuniões");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createReuniao = async (reuniao: ReuniaoCreate) => {
    const novaReuniao = await apiClient.createReuniao(reuniao);
    await reload();
    return novaReuniao;
  };

  const updateReuniao = async (id: number, reuniao: ReuniaoUpdate) => {
    const reuniaoAtualizada = await apiClient.updateReuniao(id, reuniao);
    await reload();
    return reuniaoAtualizada;
  };

  return { reunioes, loading, error, reload, createReuniao, updateReuniao };
};

export const useOcorrencias = () => {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setOcorrencias(await apiClient.getOcorrencias());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar ocorrências");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createOcorrencia = async (ocorrencia: OcorrenciaCreate) => {
    const novaOcorrencia = await apiClient.createOcorrencia(ocorrencia);
    await reload();
    return novaOcorrencia;
  };

  const updateOcorrencia = async (id: number, ocorrencia: OcorrenciaUpdate) => {
    const ocorrenciaAtualizada = await apiClient.updateOcorrencia(id, ocorrencia);
    await reload();
    return ocorrenciaAtualizada;
  };

  return { ocorrencias, loading, error, reload, createOcorrencia, updateOcorrencia };
};
