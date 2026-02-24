import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/trends"); }, [navigate]);
  return null;
};

export default Index;
