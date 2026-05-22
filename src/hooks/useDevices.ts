import { useState, useEffect, useCallback } from 'react';
import { deviceApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import type { Device, DeviceStats } from '../types/index';
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();
  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await deviceApi.getAll();
      setDevices(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des appareils');
    } finally {
      setLoading(false);
    }
  }, []);
  const fetchStats = useCallback(async () => {
    try {
      const data = await deviceApi.getStats();
      setStats(data);
    } catch {  }
  }, []);
  useEffect(() => {
    fetchDevices();
    fetchStats();
  }, [fetchDevices, fetchStats]);
  useEffect(() => {
    if (!socket) return;
    const handleStatusChange = (data: { deviceId: number; status: string; battery?: number; signal?: number }) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === data.deviceId
            ? { ...d, status: data.status as any, battery: data.battery ?? d.battery, signal: data.signal ?? d.signal }
            : d
        )
      );
    };
    const handleDeviceCreated = () => {
      fetchDevices();
      fetchStats();
    };
    const handleDeviceDeleted = () => {
      fetchDevices();
      fetchStats();
    };
    socket.on('device:statusChange', handleStatusChange);
    socket.on('device:created', handleDeviceCreated);
    socket.on('device:deleted', handleDeviceDeleted);
    return () => { 
      socket.off('device:statusChange', handleStatusChange);
      socket.off('device:created', handleDeviceCreated);
      socket.off('device:deleted', handleDeviceDeleted);
    };
  }, [socket, fetchDevices, fetchStats]);
  const createDevice = useCallback(async (device: Partial<Device>) => {
    const created = await deviceApi.create(device);
    setDevices((prev) => [created, ...prev]);
    fetchStats();
    window.dispatchEvent(new CustomEvent('device:changed'));
    return created;
  }, [fetchStats]);
  const updateDevice = useCallback(async (id: number, device: Partial<Device>) => {
    const updated = await deviceApi.update(id, device);
    setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  }, []);
  const deleteDevice = useCallback(async (id: number) => {
    await deviceApi.delete(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
    fetchStats();
    window.dispatchEvent(new CustomEvent('device:changed'));
  }, [fetchStats]);
  return {
    devices, stats, loading, error,
    fetchDevices, fetchStats, createDevice, updateDevice, deleteDevice,
  };
}
