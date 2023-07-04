import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore"; // Add 'doc' import
import { useContext, useEffect } from "react";
import { toast } from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { db } from "../firebase";
import Preloader from "./Preloader";
import "./styles/searchlist.scss";

export default function SearchList({
  results,
  err,
  setErr,
  active,
  loading,
  handleCloseSearchList,
}) {
  const { currentUser } = useContext(AuthContext);
  const { chats } = useContext(ChatContext);
  const chatsKeys = Object.keys(chats);
  const chatsToArr = Object.entries(chats);

  const getCombinedId = (user) => {
    const combinedId =
      currentUser.uid > user.uid
        ? currentUser.uid + user.uid
        : user.uid + currentUser.uid;
        
    return combinedId;
  }

  const userAlreadyExists = (user) => {
    const combinedId = getCombinedId(user);
    return [chatsKeys.includes(combinedId), chatsToArr.find(chat => chat[0] === combinedId)];
  }

  const handleChatSelect = async (user) => {
    const combinedId = getCombinedId(user);
    try {
      const res = await getDoc(doc(db, "chats", combinedId));

      if (!res.exists()) {
        await setDoc(doc(db, "chats", combinedId), { messages: [] });

        await updateDoc(doc(db, "userChats", currentUser.uid), {
          [combinedId + ".userInfo"]: {
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
          },
          [combinedId + ".date"]: serverTimestamp(),
        });

        await updateDoc(doc(db, "userChats", user.uid), {
          [combinedId + ".userInfo"]: {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          },
          [combinedId + ".date"]: serverTimestamp(),
        });
      }
      
      toast.success("Started New Conversation");
      handleCloseSearchList();
    } catch (error) {
      setErr(error);
      console.error(err);
      toast.error("Something Went Wrong");
    }}

  const users = results.map((user) => {
    const [exists, chat] = userAlreadyExists(user);
    const lastMessage = exists && chat ? chat[1].lastMessage?.text : "Start a New Conversation";

    return (
      <li key={user.uid} onClick={() => handleChatSelect(user)} className="d-f">
        <img src={user.photoURL} alt={user.displayName} className="pfp" />
        <div className="infos_container">
          <h3>{user.displayName}</h3>
          <p>{lastMessage}</p>
        </div>
      </li>
    );
  });

  return (
    <main className={`searchlist ${active}`}>
      <ul>
        {loading && <Preloader />}
        {!loading && users}
      </ul>
    </main>
  );
}