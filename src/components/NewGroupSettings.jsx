import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useContext, useState } from "react";
import { toast } from "react-hot-toast";
import { v4 as uuid } from "uuid";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { db, storage } from "../firebase";
import "./styles/newgroupsettings.scss";

export default function NewGroupSettings(props) {
    const [groupImg, setGroupImg] = useState(null);
    const [groupImgUrl, setGroupImgUrl] = useState("");
    const [err, setErr] = useState("");
    const [groupName, setGroupName] = useState("");
    const { currentUser } = useContext(AuthContext);
    const { selectedUsers } = useContext(ChatContext);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setGroupImg(file);
        const fileURL = URL.createObjectURL(file);
        setGroupImgUrl(fileURL);
    }

    const handleGroupNameInput = (e) => {
      setGroupName(e.target.value);
    }

    const handleGoBack = () => {
        props.setSettingsActive(false);
        setGroupImg(null);
        setGroupName("");
        setGroupImgUrl("");
    }

    const getGroupCombinedIds = (users) => {
      const userIds = users.map((user) => user.uid);
      const combinedId = userIds.sort().join("");

      return combinedId;
    }
    
    const createNewGroup = async () => {
      const combinedId = getGroupCombinedIds([...selectedUsers, currentUser]);
      const res = await getDoc(doc(db, "chats", combinedId));
      const groupUsers = [...selectedUsers, currentUser].map((user) => {
        return {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
      });

      if (!res.exists()) {
        await setDoc(doc(db, "chats", combinedId), {
          type: "group",
          messages: [],
        });
        if (groupImg) {
          const storageRef = ref(storage, `groupPfps/${uuid()}`);

          await uploadBytesResumable(storageRef, groupImg).then(async () => {
            const downloadUrl = await getDownloadURL(storageRef);

            const batch = writeBatch(db);

            for (const user of groupUsers) {
              const userChatRef = doc(db, "userChats", user.uid);
              batch.set(
                userChatRef,
                {
                  [combinedId]: {
                    type: "group",
                    groupName: groupName,
                    groupUsers: groupUsers,
                    groupImg: downloadUrl, // Assegna l'URL dell'immagine al campo groupImg
                    date: serverTimestamp(),
                  },
                },
                { merge: true }
              );
            }

            await batch.commit();
          });
        } else {
          await setDoc(doc(db, "chats", combinedId), {
            type: "group",
            messages: [],
          });

          const batch = writeBatch(db);

          for (const user of groupUsers) {
            const userChatRef = doc(db, "userChats", user.uid);
            batch.set(
              userChatRef,
              {
                [combinedId]: {
                  type: "group",
                  groupName: groupName,
                  groupUsers: groupUsers,
                  groupImg: null, // Assegna null al campo groupImg
                  date: serverTimestamp(),
                },
              },
              { merge: true }
            );
          }

          await batch.commit();
        }
        
        handleGoBack();
        props.setActive(false);
      } else {
        toast.error("This Group Already Exists");
        return;
      }
    };

    return (
      <div className="group_container settings">
        <div className="group_infos d-f">
          <div className="group_infos-wrapper d-f">
            <div className="d-f">
              <svg
                onClick={handleGoBack}
                viewBox="0 0 24 24"
                height="24"
                width="24"
              >
                <path
                  fill="currentColor"
                  d="M12,4l1.4,1.4L7.8,11H20v2H7.8l5.6,5.6L12,20l-8-8L12,4z"
                ></path>
              </svg>
            </div>
            <h1>New Group</h1>
          </div>
        </div>

        <label htmlFor="group-img-input" className="group_pfp d-f">
          <svg viewBox="0 0 212 212" height="200" width="200">
            <path
              d="M105.946 0.25C164.318 0.25 211.64 47.596 211.64 106C211.64 164.404 164.318 211.75 105.945 211.75C47.571 211.75 0.25 164.404 0.25 106C0.25 47.596 47.571 0.25 105.946 0.25Z"
              fill="#2d383e"
            ></path>
            <path
              d="M102.282 77.2856C102.282 87.957 93.8569 96.5713 83.3419 96.5713C72.827 96.5713 64.339 87.957 64.339 77.2856C64.339 66.6143 72.827 58 83.3419 58C93.8569 58 102.282 66.6143 102.282 77.2856ZM150.35 80.1427C150.35 89.9446 142.612 97.857 132.954 97.857C123.296 97.857 115.5 89.9446 115.5 80.1427C115.5 70.3409 123.296 62.4285 132.954 62.4285C142.612 62.4285 150.35 70.3409 150.35 80.1427ZM83.3402 109.428C68.5812 109.428 39 116.95 39 131.928V143.714C39 147.25 41.8504 148 45.3343 148H121.346C124.83 148 127.68 147.25 127.68 143.714V131.928C127.68 116.95 98.0991 109.428 83.3402 109.428ZM126.804 110.853C127.707 110.871 128.485 110.886 129 110.886C143.759 110.886 174 116.95 174 131.929V141.571C174 145.107 171.15 148 167.666 148H134.854C135.551 146.007 135.995 143.821 135.995 141.571L135.75 131.071C135.75 121.51 130.136 117.858 124.162 113.971C122.772 113.067 121.363 112.15 120 111.143C119.981 111.123 119.962 111.098 119.941 111.07C119.893 111.007 119.835 110.931 119.747 110.886C121.343 110.747 124.485 110.808 126.804 110.853Z"
              fill="#414b52"
            ></path>
          </svg>

          <div className="group_img_container">
            {groupImgUrl !== "" && <img src={groupImgUrl} />}
          </div>

          {!groupImg && <h1>ADD NEW GROUP IMG</h1>}

          <input
            type="file"
            accept="image/png, image/jpeg"
            id="group-img-input"
            onChange={handleImageChange}
          />
        </label>

        <div className="group_name">
          <input value={groupName} onChange={handleGroupNameInput} className="group" type="text" placeholder="Group's name" />
        </div>

        {groupName !== "" && <div className="group_create settings" onClick={createNewGroup}>
          <svg viewBox="0 0 24 24" height="24" width="24"><path fill="currentColor" d="M8,17.1l-5.2-5.2l-1.7,1.7l6.9,7L22.9,5.7L21.2,4L8,17.1z"></path></svg>
        </div>}
      </div>
    );
};
