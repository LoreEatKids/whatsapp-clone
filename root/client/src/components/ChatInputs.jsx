import EmojiPicker, { Theme } from "emoji-picker-react";
import { Timestamp, arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useContext, useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { db, storage } from "../firebase";
import "./styles/ChatInputs.scss";

export default function ChatInputs() {
    const [text, setText] = useState("");
    const [audioFile, setAudioFile] = useState(null);
    const {currentUser} = useContext(AuthContext);
    const [emojiMenuVisible, setEmojiMenuVisible] = useState(false);
    const { data, setImgModalVisible, img, setImg} = useContext(ChatContext);

    const clearStates = () => {
      setText("");
      setImg(null);
      setAudioFile(null);
      setEmojiMenuVisible(false);
      setImgModalVisible([false, ""]);
    };

    useEffect(() => {
      const unSub = () => clearStates();

      return () => {
        unSub();
      };
    }, [data.chatId]);

    const handleTextChange = e => setText(e.target.value);
    const handleImgChange = e => {
      const file = e.target.files[0];
      if (file && file.type.startsWith("image/")) {
        setImg(file);
        setImgModalVisible([true, URL.createObjectURL(file)]);
      }
    }

    const toggleEmojiMenu = () => setEmojiMenuVisible(!emojiMenuVisible);
    const handleEmojiClick = (emoji) => setText(prevText => prevText + emoji.emoji);

    const handleKeyDown = e => {
        if (e.keyCode === 13) {
            if(text === "" && img === null) return;
            else handleSubmit();
        }
    }
    
    const handleSubmit = async () => {
      clearStates();
      
      if(img) {
        const storageRef = ref(storage, `chatImgs/${uuid()}`);
        
        await uploadBytesResumable(storageRef, img).then(() => {
          getDownloadURL(storageRef).then(async (downloadURL) => {
            try {
              await updateDoc(doc(db, "chats", data.chatId), {
                messages: arrayUnion({
                  id: uuid(),
                  text,
                  senderId: currentUser.uid,
                  date: Timestamp.now(),
                  img: downloadURL,
                }),
              });
            } catch(error) {
              console.error(error)
            }
          })
        });
      } else if(audioFile) {
        return
      } else {
        await updateDoc(doc(db, "chats", data.chatId), {
          messages: arrayUnion({
            id: uuid(),
            text,
            senderId: currentUser.uid,
            date: Timestamp.now(),
          }),
        });
      }

      const lastMesssge = img ? "Photo" : text;
      await updateDoc(doc(db, "userChats", currentUser.uid), {
        [data.chatId + ".lastMessage"]: {
          text: lastMesssge,
        },
        [data.chatId + ".date"]: serverTimestamp(),
      });

      if(Object.entries(data.group).length > 0) {
        data.group.groupUsers.forEach( async (user) => {
            await updateDoc(doc(db, "userChats", user.uid), {
            [data.chatId + ".lastMessage"]: {
              text: lastMesssge,
              sender: currentUser.displayName,
            },
            [data.chatId + ".date"]: serverTimestamp(),
          });
        })
      } else {
        await updateDoc(doc(db, "userChats", data.user.uid), {
          [data.chatId + ".lastMessage"]: {
            text: lastMesssge,
          },
          [data.chatId + ".date"]: serverTimestamp(),
        });
      }
    };

    return (
        <>
            <section className="inputs_container d-f">
              
                {emojiMenuVisible && (
                  <div className="emoji-menu">
                    <EmojiPicker onEmojiClick={(emoji) => handleEmojiClick(emoji)} theme={Theme.DARK} lazyLoadEmojis="true" />
                  </div>
                )}

                <div className="icons_container flex">
                    <button className="d-f" type="button" onClick={toggleEmojiMenu}>
                      <svg viewBox="0 0 24 24" height="25.5" width="25.5"><path fill="currentColor" d="M9.153,11.603c0.795,0,1.439-0.879,1.439-1.962S9.948,7.679,9.153,7.679 S7.714,8.558,7.714,9.641S8.358,11.603,9.153,11.603z M5.949,12.965c-0.026-0.307-0.131,5.218,6.063,5.551 c6.066-0.25,6.066-5.551,6.066-5.551C12,14.381,5.949,12.965,5.949,12.965z M17.312,14.073c0,0-0.669,1.959-5.051,1.959 c-3.505,0-5.388-1.164-5.607-1.959C6.654,14.073,12.566,15.128,17.312,14.073z M11.804,1.011c-6.195,0-10.826,5.022-10.826,11.217 s4.826,10.761,11.021,10.761S23.02,18.423,23.02,12.228C23.021,6.033,17.999,1.011,11.804,1.011z M12,21.354 c-5.273,0-9.381-3.886-9.381-9.159s3.942-9.548,9.215-9.548s9.548,4.275,9.548,9.548C21.381,17.467,17.273,21.354,12,21.354z  M15.108,11.603c0.795,0,1.439-0.879,1.439-1.962s-0.644-1.962-1.439-1.962s-1.439,0.879-1.439,1.962S14.313,11.603,15.108,11.603z"></path></svg>
                    </button>
                    
                    <div className="input_img-container flex">
                      <svg viewBox="0 0 24 24" height="24" width="24"><path fill="currentColor" d="M1.816,15.556v0.002c0,1.502,0.584,2.912,1.646,3.972s2.472,1.647,3.974,1.647 c1.501,0,2.91-0.584,3.972-1.645l9.547-9.548c0.769-0.768,1.147-1.767,1.058-2.817c-0.079-0.968-0.548-1.927-1.319-2.698 c-1.594-1.592-4.068-1.711-5.517-0.262l-7.916,7.915c-0.881,0.881-0.792,2.25,0.214,3.261c0.959,0.958,2.423,1.053,3.263,0.215 c0,0,3.817-3.818,5.511-5.512c0.28-0.28,0.267-0.722,0.053-0.936c-0.08-0.08-0.164-0.164-0.244-0.244 c-0.191-0.191-0.567-0.349-0.957,0.04c-1.699,1.699-5.506,5.506-5.506,5.506c-0.18,0.18-0.635,0.127-0.976-0.214 c-0.098-0.097-0.576-0.613-0.213-0.973l7.915-7.917c0.818-0.817,2.267-0.699,3.23,0.262c0.5,0.501,0.802,1.1,0.849,1.685 c0.051,0.573-0.156,1.111-0.589,1.543l-9.547,9.549c-0.756,0.757-1.761,1.171-2.829,1.171c-1.07,0-2.074-0.417-2.83-1.173 c-0.755-0.755-1.172-1.759-1.172-2.828l0,0c0-1.071,0.415-2.076,1.172-2.83c0,0,5.322-5.324,7.209-7.211 c0.157-0.157,0.264-0.579,0.028-0.814c-0.137-0.137-0.21-0.21-0.342-0.342c-0.2-0.2-0.553-0.263-0.834,0.018 c-1.895,1.895-7.205,7.207-7.205,7.207C2.4,12.645,1.816,14.056,1.816,15.556z"></path></svg>
                      <input
                      type="file"
                      accept="image/*"
                      onChange={handleImgChange} multiple={false}/>
                    </div>
                </div>

                <div className="input_container">
                    <input placeholder="Scrivi un messaggio" value={text} onChange={(e) => handleTextChange(e)} onKeyDown={(e) => handleKeyDown(e)} />
                    {text === "" && !img ? 
                      <svg viewBox="0 0 24 24" height="24" width="24"><path fill="currentColor" d="M11.999,14.942c2.001,0,3.531-1.53,3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531 S8.469,2.35,8.469,4.35v7.061C8.469,13.412,9.999,14.942,11.999,14.942z M18.237,11.412c0,3.531-2.942,6.002-6.237,6.002 s-6.237-2.471-6.237-6.002H3.761c0,4.001,3.178,7.297,7.061,7.885v3.884h2.354v-3.884c3.884-0.588,7.061-3.884,7.061-7.885 L18.237,11.412z"></path></svg> 
                    : <svg onClick={handleSubmit} viewBox="0 0 24 24" height="24" width="24"><path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path></svg>}
                </div>
            </section>
        </>
    )
};
