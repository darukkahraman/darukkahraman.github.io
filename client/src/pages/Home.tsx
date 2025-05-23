import { useEffect } from "react";
import Header from "@/components/Header";
import ComposeBox from "@/components/ComposeBox";
import Feed from "@/components/Feed";

interface HomeProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const Home = ({ activeView, setActiveView }: HomeProps) => {
  useEffect(() => {
    if (activeView !== "home") {
      setActiveView("home");
    }
  }, [activeView, setActiveView]);

  return (
    <div>
      <Header title="Home" />
      <ComposeBox />
      <Feed />
    </div>
  );
};

export default Home;
