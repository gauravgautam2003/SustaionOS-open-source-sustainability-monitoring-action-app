import { useEffect, useState } from 'react';
import { fetchSensors } from '../services/sensorService';

const useSensors = () => {
  const [sensors, setSensors] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchSensors();
      setSensors(data);
    };
    load();
  }, []);

  return sensors;
};

export default useSensors;
