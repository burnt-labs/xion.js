import { useContext } from "react";
import { AbstraxionContext } from "../components/AbstraxionContext";

export const useModal = (): [
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>,
] => {
  const { showModal, setShowModal } = useContext(AbstraxionContext);
  return [showModal, setShowModal];
};
