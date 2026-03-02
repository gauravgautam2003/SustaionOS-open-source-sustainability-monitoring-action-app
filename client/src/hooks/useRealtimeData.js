import { useEffect, useState } from 'react';

const useRealtimeData = (subscribe) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!subscribe) return;
    // placeholder for real-time data subscription
  }, [subscribe]);

  return data;
};

export default useRealtimeData;
