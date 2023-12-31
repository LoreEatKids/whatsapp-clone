import { signOut, updateProfile } from "firebase/auth";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useContext, useEffect, useRef, useState } from "react";
import ContentEditable from "react-contenteditable";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import { ImgViewerContext } from "../context/ImgViewer";
import { auth, db } from "../firebase";
import { getUserFromFirestore, isDisplayNameUnique } from "../utilities/const";
import Chats from "./Chats";
import Navbar from "./Navbar";
import NewGroup from "./NewGroup";
import NewGroupSettings from "./NewGroupSettings";
import "./styles/aside.scss";

export default function Aside() {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const { setImgInfos, setImgViewerIsActive } = useContext(ImgViewerContext);

  const [groupSearchResults, setGroupSearchResults] = useState([]);

  const [groupMenuActive, setGroupMenuActive] = useState(false);
  const [groupSettingsActive, setGroupSettingsActive] = useState(false);
  const { setActive, setChats } = useContext(ChatContext);

  const [profileSettingsIsActive, setProfileSettingsIsActive] = useState(false);

  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  
  
  const [currentDesc, setCurrentDesc] = useState("");
  const newDescRef = useRef("Loading..."); // library ref
  const newDisplayNameRef = useRef("Loading..."); // library ref
  
  const handleViewUserImg = () => {
    setImgInfos({
      user: { 
        photoURL: currentUser.photoURL,
        displayName: currentUser.displayName,
      },
      img: { url: currentUser.photoURL }
    })
    setImgViewerIsActive(true);
  }

  useEffect(() => {
    const unsub = async () => {
      if (!currentUser) return;
      newDisplayNameRef.current = currentUser?.displayName;

      // logic for desc
      const currentUserFromFirestore = await getUserFromFirestore(currentUser);
      const currentUserDesc = currentUserFromFirestore.desc;

      setCurrentDesc(currentUserDesc);
      newDescRef.current = currentUserDesc;
    };

    unsub();
  }, [currentUser]); // get current displayName and desc as soon as app loads

  useEffect(() => {
    const unsub = async () => {
      if (!currentUser || newDisplayNameRef.current === currentUser.displayName)
        return;

      const currDisplayName = currentUser.displayName;
      const newDisplayName = newDisplayNameRef.current;

      try {
        const isUnique = await isDisplayNameUnique(newDisplayName);
        if (!isUnique) {
          newDisplayNameRef.current = currDisplayName;
          toast.error("This Display Name is already taken, please choose another one. ");
          return;
        }
      } catch (error) {
        console.error(error);
        toast.error("Somthing went wrong, please try again.");
        return;
      }

      try {
        // update all chats where there is the currentUser
        const userChatsRef = collection(db, "userChats");
        const querySnapshot = await getDocs(userChatsRef);

        const filteredChats = [];
        querySnapshot.forEach((doc) => {
          const chatData = Object.entries(doc.data());
          chatData.forEach((chat) => {
            if (chat[1]?.type === "group"){
              return; // TODO handle group type chat when changing name
            }
            if (chat[1].userInfo.displayName === currDisplayName)
              filteredChats.push(chat);
          });
        });

        filteredChats.forEach(async (chat) => {
          const chatId = chat[0];
          const chatCreatorUid = chat[1].chattingWith.uid;

          const updatedUserInfo = {
            ...chat[1].userInfo,
            displayName: newDisplayName,
          };

          await updateDoc(doc(db, "userChats", chatCreatorUid), {
            [chatId + ".userInfo"]: updatedUserInfo,
          });
        });

        // update displayname for currentUser instance
        await updateProfile(currentUser, {
          displayName: newDisplayName,
        });

        // update displayname in firestore
        const currentUserRef = doc(db, "users", currentUser.uid);
        await updateDoc(currentUserRef, {
          displayName: newDisplayName,
          usernameToLowerCase: newDisplayName.toLowerCase(),
        });

        toast.success("Successfully changed your name");
      } catch (error) {
        console.error(error);
        toast.error("Somthing went wrong, please try again.");
      }
    };

    return () => unsub();
  }, [newDisplayNameRef.current]); // changes displayName when displayName ref value changes

  useEffect(() => {
    const unsub = async () => {
      if (
        !currentUser ||
        newDescRef.current === currentDesc ||
        currentDesc === ""
      )
        return;

      const newDesc = newDescRef.current;
      try {
        // update displayname in firestore

        const currentUserRef = doc(db, "users", currentUser.uid);
        await updateDoc(currentUserRef, {
          desc: newDesc,
        });

        toast.success("Successfully changed your infos");
      } catch (error) {
        console.error(error);
        toast.error("Somthing went wrong, please try again.");
      }
    };

    return () => unsub();
  }, [newDescRef.current]); // changes displayName when desc ref value changes

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  };

  const handleExitProfileSettings = () => {
    setProfileSettingsIsActive(false);
    setIsEditingDisplayName(false);
    newDisplayNameRef.current = currentUser.displayName;
  };

  const handleLogout = async () => {
    await signOut(auth);
    setChats([]);
    navigate("/register");
    toast.success("Successfully logout");
  };

  const handleNewGroup = () => {
    setGroupMenuActive(true);
    setActive(false);
  };

  return (
    <aside>
      {groupMenuActive && (
        <NewGroup
          setActive={setGroupMenuActive}
          setSettingsActive={setGroupSettingsActive}
          groupSearchResults={groupSearchResults}
          setGroupSearchResults={setGroupSearchResults}
        />
      )}
      {groupSettingsActive && (
        <NewGroupSettings
          setSettingsActive={setGroupSettingsActive}
          setActive={setGroupMenuActive}
        />
      )}

      <header className="d-f">
        <div className="img-container d-f">
          <img
            className="pfp"
            src={currentUser.photoURL}
            alt="pfp"
            onClick={() => setProfileSettingsIsActive(true)}
          />
          <button type="button" onClick={handleLogout}>
            logout
          </button>
        </div>
        <div className="links d-f">
          <svg
            viewBox="0 0 28 28"
            height="28"
            width="28"
            onClick={handleNewGroup}
            preserveAspectRatio="xMidYMid meet"
            fill="currentColor"
          >
            <path
              d="M19.2146 12.1436C19.2257 12.2242 19.2405 12.3027 19.2587 12.38C19.2678 12.4192 19.2777 12.4573 19.2885 12.4942C19.3098 12.5695 19.3347 12.6435 19.3631 12.7161C19.4049 12.8228 19.4541 12.9261 19.5103 13.0253C19.5476 13.0903 19.5878 13.1541 19.6308 13.2146C19.7592 13.3979 19.9131 13.5599 20.0872 13.6953C20.2045 13.7857 20.3297 13.8641 20.4611 13.9294C20.5619 13.979 20.6659 14.0209 20.7723 14.0549C20.8441 14.0773 20.9175 14.0964 20.9926 14.112C21.1465 14.1432 21.3029 14.159 21.4596 14.1591C22.7133 14.1591 23.7297 13.0907 23.7297 11.7727C23.7297 10.4548 22.7133 9.38636 21.4596 9.38636C21.3028 9.38593 21.1464 9.40169 20.9926 9.43343C20.9183 9.44836 20.8448 9.46743 20.7723 9.49057C20.6659 9.52417 20.5619 9.56573 20.4611 9.61493C20.1326 9.77773 19.8474 10.0232 19.6308 10.3297C19.5881 10.3913 19.5476 10.4541 19.5103 10.5202C19.4539 10.6192 19.4047 10.7226 19.3631 10.8294C19.3351 10.9011 19.3098 10.975 19.2885 11.0501C19.2776 11.0882 19.2677 11.1263 19.2587 11.1644C19.2405 11.2417 19.2257 11.3201 19.2146 11.4008C19.1807 11.6471 19.1807 11.8972 19.2146 12.1436ZM8.78544 12.1436C8.77479 12.2242 8.75955 12.3027 8.74143 12.38C8.73233 12.4192 8.72238 12.4573 8.71158 12.4942C8.69029 12.5695 8.66539 12.6435 8.63697 12.7161C8.5951 12.8228 8.54587 12.9261 8.48968 13.0253C8.45248 13.0903 8.4123 13.1541 8.36935 13.2146C8.2408 13.3978 8.08694 13.5598 7.91285 13.6953C7.79563 13.7857 7.67043 13.8641 7.53896 13.9294C7.43819 13.979 7.33419 14.0209 7.22773 14.0549C7.1559 14.0773 7.08246 14.0964 7.00743 14.112C6.85355 14.1432 6.6972 14.159 6.54049 14.1591C5.28668 14.1591 4.27027 13.0907 4.27027 11.7727C4.27027 10.4548 5.28668 9.38636 6.54049 9.38636C6.69722 9.38594 6.85362 9.4017 7.00743 9.43343C7.08177 9.44837 7.15531 9.46745 7.22773 9.49057C7.33416 9.52417 7.43817 9.56573 7.53896 9.61493C7.86749 9.77773 8.15273 10.0232 8.36935 10.3297C8.41198 10.3913 8.45248 10.4541 8.48968 10.5202C8.54608 10.6192 8.59532 10.7226 8.63697 10.8294C8.66501 10.9011 8.69027 10.975 8.71158 11.0501C8.72231 11.0882 8.73226 11.1263 8.74143 11.1644C8.75955 11.2417 8.77436 11.3201 8.78544 11.4008C8.81927 11.6471 8.81927 11.8972 8.78544 12.1436ZM25.8687 17.9655C25.8408 17.9167 25.81 17.8635 25.7724 17.8045C25.732 17.741 25.6864 17.673 25.6341 17.6005C25.5818 17.5279 25.524 17.4509 25.459 17.3715C25.3939 17.2922 25.3229 17.2106 25.2447 17.1267C24.925 16.7866 24.5597 16.4953 24.1598 16.2618C24.0335 16.187 23.8993 16.1167 23.7576 16.0498C23.7533 16.0476 23.7496 16.0464 23.7455 16.0442C22.1352 15.3489 20.3211 15.3489 18.7108 16.0442C18.6881 16.0544 18.6667 16.0657 18.6447 16.077C18.6086 16.094 18.5756 16.1133 18.5405 16.1314C18.5601 16.1428 18.5801 16.153 18.5996 16.1643C18.9985 16.3978 19.3771 16.6663 19.7312 16.9668C19.9625 17.1625 20.1826 17.3718 20.3904 17.5937C20.5189 17.7297 20.6364 17.8646 20.7437 17.9961C20.8538 18.131 20.9503 18.2568 21.0364 18.377C21.125 18.5005 21.2015 18.615 21.2698 18.7204C21.3344 18.8224 21.3891 18.9131 21.4363 18.997C21.5259 19.1507 21.5927 19.3172 21.6345 19.4912L21.652 19.6136H26V18.2273C25.9621 18.1371 25.9182 18.0496 25.8687 17.9655ZM17.5278 10.1666C17.5102 10.0398 17.487 9.91635 17.4584 9.79522C17.4442 9.73465 17.4285 9.67408 17.4115 9.61466C17.3777 9.49581 17.3386 9.38039 17.2945 9.26726C17.2289 9.09959 17.1515 8.93725 17.0631 8.78158C17.0046 8.67873 16.9415 8.57931 16.8739 8.48332C16.5346 8.00097 16.0861 7.61525 15.5691 7.36112C15.4109 7.28296 15.2473 7.21726 15.0798 7.16456C14.967 7.12913 14.8515 7.09828 14.7337 7.07428C14.4919 7.02494 14.2462 7 13.9999 7C11.9785 7 10.4324 8.62502 10.4324 10.7506C10.4324 12.8761 11.9785 14.5 13.9999 14.5C14.2462 14.5 14.4919 14.4751 14.7337 14.4257C14.8515 14.4017 14.967 14.3709 15.0798 14.3354C15.2473 14.2827 15.4109 14.217 15.5691 14.1389C16.0861 13.8847 16.5346 13.499 16.8739 13.0167C16.9414 12.9207 17.0045 12.8213 17.0631 12.7184C17.1515 12.5627 17.2289 12.4004 17.2945 12.2327C17.338 12.1196 17.3777 12.003 17.4115 11.8853C17.4285 11.8259 17.4442 11.7654 17.4584 11.7048C17.487 11.5837 17.5102 11.4602 17.5278 11.3334C17.5808 10.9465 17.5808 10.5535 17.5278 10.1666ZM20.6193 19.4555C20.5796 19.3837 20.5339 19.3049 20.4804 19.218C20.4229 19.1253 20.3569 19.0245 20.2824 18.9179C20.2078 18.8113 20.1246 18.6978 20.0322 18.5819C19.9399 18.466 19.8381 18.3444 19.7265 18.2227C19.5473 18.0258 19.3577 17.8397 19.1588 17.6654C18.8523 17.3979 18.5247 17.1587 18.1798 16.9505C17.9998 16.8416 17.8086 16.7373 17.6063 16.64C17.6008 16.6364 17.595 16.6333 17.5891 16.6307C16.6495 16.1788 15.4683 15.8636 13.9998 15.8636C12.5313 15.8636 11.3499 16.1788 10.4105 16.6307C10.3778 16.6457 10.348 16.6631 10.3161 16.6793C10.1788 16.7477 10.0469 16.8195 9.92017 16.8925C9.85146 16.9331 9.78428 16.9737 9.71862 17.0142C9.41108 17.2077 9.11765 17.4253 8.84079 17.6654C8.6418 17.8397 8.45224 18.0257 8.27305 18.2227C8.16168 18.3444 8.06003 18.4649 7.96733 18.5819C7.87464 18.6989 7.79166 18.8102 7.71709 18.9179C7.64252 19.0257 7.57668 19.1253 7.51914 19.218C7.46564 19.3049 7.42 19.3837 7.38037 19.4555C7.37666 19.4611 7.37327 19.4669 7.37021 19.4729C7.32851 19.5482 7.29455 19.6143 7.26769 19.6687C7.21397 19.7777 7.18919 19.8391 7.18919 19.8391V22H20.8108V19.8391C20.754 19.7074 20.6901 19.5793 20.6193 19.4555ZM6.35546 19.4924C6.36554 19.4066 6.39303 19.324 6.43613 19.2498C6.46975 19.1841 6.49499 19.1048 6.54734 19.013C6.60542 18.9121 6.65115 18.8226 6.71464 18.7217C6.78264 18.6152 6.85571 18.5007 6.94322 18.3795C7.03072 18.2582 7.12639 18.1301 7.23395 17.9987C7.34152 17.8672 7.45967 17.7312 7.58895 17.5929C8.08473 17.0649 8.64795 16.6085 9.26317 16.2364C9.3271 16.1978 9.393 16.1593 9.45946 16.1219C9.43069 16.1072 9.40435 16.0913 9.37449 16.0777C9.35244 16.0664 9.3304 16.055 9.30836 16.0448C8.51449 15.6871 7.65502 15.5093 6.78837 15.5235C5.92176 15.5093 5.06232 15.6871 4.26849 16.0448C4.2643 16.0471 4.26055 16.0482 4.25636 16.0505C4.11441 16.1174 3.98006 16.1876 3.85365 16.2624C3.61148 16.404 3.38154 16.5667 3.16637 16.7486C3.02676 16.8672 2.89361 16.9935 2.76751 17.1272C2.68926 17.211 2.61777 17.2926 2.55304 17.372C2.48813 17.4513 2.42972 17.5283 2.37736 17.6009C2.32501 17.6734 2.27873 17.7414 2.23828 17.8049C2.20081 17.8638 2.16532 17.9171 2.13743 17.9658C2.04497 18.1267 2 18.2276 2 18.2276V19.6136H6.34741L6.35546 19.4924Z"
              fill="currentColor"
            ></path>
          </svg>
          <svg
            viewBox="0 0 24 24"
            height="24"
            width="24"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              fill="currentColor"
              d="M12,20.664c-2.447,0.006-4.795-0.966-6.521-2.702c-0.381-0.381-0.381-1,0-1.381c0.381-0.381,1-0.381,1.381,0 l0,0c2.742,2.742,7.153,2.849,10.024,0.244c0.4-0.361,1.018-0.33,1.379,0.07c0.36,0.398,0.33,1.013-0.066,1.375 C16.502,19.813,14.292,20.666,12,20.664z M19.965,14.552c-0.539,0-0.977-0.437-0.977-0.976c0-0.085,0.011-0.17,0.033-0.253 c1.009-3.746-1.105-7.623-4.8-8.804c-0.51-0.175-0.782-0.731-0.607-1.241c0.17-0.495,0.7-0.768,1.201-0.619 c4.688,1.498,7.371,6.416,6.092,11.169C20.793,14.255,20.407,14.551,19.965,14.552z M3.94,14.162 c-0.459-0.001-0.856-0.321-0.953-0.769C1.939,8.584,4.858,3.801,9.613,2.533c0.52-0.144,1.058,0.161,1.201,0.681 c0.144,0.52-0.161,1.058-0.681,1.201c-0.005,0.001-0.01,0.003-0.015,0.004C6.37,5.418,4.07,9.187,4.895,12.977 c0.114,0.527-0.221,1.048-0.748,1.162C4.079,14.154,4.01,14.162,3.94,14.162z"
            ></path>
          </svg>
          <svg
            viewBox="0 0 24 24"
            height="24"
            width="24"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              fill="currentColor"
              d="M19.005,3.175H4.674C3.642,3.175,3,3.789,3,4.821V21.02 l3.544-3.514h12.461c1.033,0,2.064-1.06,2.064-2.093V4.821C21.068,3.789,20.037,3.175,19.005,3.175z M14.016,13.044H7.041V11.1 h6.975V13.044z M17.016,9.044H7.041V7.1h9.975V9.044z"
            ></path>
          </svg>
          <svg
            viewBox="0 0 24 24"
            height="24"
            width="24"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              fill="currentColor"
              d="M12,7c1.104,0,2-0.896,2-2c0-1.105-0.895-2-2-2c-1.104,0-2,0.894-2,2 C10,6.105,10.895,7,12,7z M12,9c-1.104,0-2,0.894-2,2c0,1.104,0.895,2,2,2c1.104,0,2-0.896,2-2C13.999,9.895,13.104,9,12,9z M12,15 c-1.104,0-2,0.894-2,2c0,1.104,0.895,2,2,2c1.104,0,2-0.896,2-2C13.999,15.894,13.104,15,12,15z"
            ></path>
          </svg>
        </div>
      </header>
      <article>
        <Navbar />
        <Chats />
      </article>

      {profileSettingsIsActive && (
        <div className="profile_settings">
          <header className="d-f">
            <svg
              onClick={handleExitProfileSettings}
              viewBox="0 0 24 24"
              height="24"
              width="24"
            >
              <path
                fill="currentColor"
                d="M12,4l1.4,1.4L7.8,11H20v2H7.8l5.6,5.6L12,20l-8-8L12,4z"
              ></path>
            </svg>
            <h1>Profile</h1>
          </header>
          <main>
            <div className="img-container">
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                onClick={handleViewUserImg}
                width="200px"
                height="200px"
              />
            </div>
            <div className="user_infos">
              <div className="user_tab">
                <h2>Your Name</h2>
                <div>
                  <div
                    className={`input_container d-f ${
                      isEditingDisplayName ? "editing" : ""
                    }`}
                  >
                    <ContentEditable
                      suppressContentEditableWarning
                      html={newDisplayNameRef.current}
                      onBlur={async (event) => {
                        if (newDisplayNameRef.current === "") newDisplayNameRef.current = event.target.value = currentUser.displayName;

                        const isUnique = await isDisplayNameUnique(event.target.value);
                        if(!isUnique) {
                            event.target.value = currentUser.displayName;
                            newDisplayNameRef.current = currentUser.displayName;
                            toast.error("This Display Name is already taken, please choose another one.");
                        }

                        setIsEditingDisplayName(false);
                      }}
                      onFocus={(event) => {
                        event.target.value = "";
                        setIsEditingDisplayName(true);
                      }}
                      onChange={(event) => {
                        newDisplayNameRef.current = event.target.value
                          .replace(/(<([^>]+)>)/gi, "")
                          .trim();
                      }} // get rid of any html element and trim and check if displayName is unique
                      onKeyDown={handleKeyPress}
                      spellCheck={false}
                      className="username_input"
                    />
                    {isEditingDisplayName ? (
                      <svg viewBox="0 0 24 24" height="24" width="24">
                        <path
                          fill="currentColor"
                          d="M9,17.2l-4-4l-1.4,1.3L9,19.9L20.4,8.5L19,7.1L9,17.2z"
                        ></path>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" height="24" width="24">
                        <path
                          fill="currentColor"
                          d="M3.95,16.7v3.4h3.4l9.8-9.9l-3.4-3.4L3.95,16.7z M19.75,7.6c0.4-0.4,0.4-0.9,0-1.3 l-2.1-2.1c-0.4-0.4-0.9-0.4-1.3,0l-1.6,1.6l3.4,3.4L19.75,7.6z"
                        ></path>
                      </svg>
                    )}
                  </div>
                  <p>
                    This is username and will be visible to everyone wants to
                    chat with you, click to change.
                  </p>
                </div>
              </div>

              <div className="user_tab">
                <h2>Your Infos</h2>
                <div>
                  <div
                    className={`input_container d-f ${
                      isEditingDesc ? "editing" : ""
                    }`}
                  >
                    <ContentEditable
                      suppressContentEditableWarning
                      html={newDescRef.current}
                      onBlur={(event) => {
                        if (newDescRef.current === "")
                          newDescRef.current = event.target.value =
                            "I am using Whatsapp Clone!"
                        setIsEditingDesc(false);
                      }}
                      onFocus={() => setIsEditingDesc(true)}
                      onChange={(event) =>
                        (newDescRef.current = event.target.value
                          .replace(/(<([^>]+)>)/gi, "")
                          .trim())
                      } // get rid of any html element and trim
                      onKeyDown={handleKeyPress}
                      spellCheck={false}
                      className="username_input"
                    />

                    {isEditingDesc ? (
                      <svg viewBox="0 0 24 24" height="24" width="24">
                        <path
                          fill="currentColor"
                          d="M9,17.2l-4-4l-1.4,1.3L9,19.9L20.4,8.5L19,7.1L9,17.2z"
                        ></path>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" height="24" width="24">
                        <path
                          fill="currentColor"
                          d="M3.95,16.7v3.4h3.4l9.8-9.9l-3.4-3.4L3.95,16.7z M19.75,7.6c0.4-0.4,0.4-0.9,0-1.3 l-2.1-2.1c-0.4-0.4-0.9-0.4-1.3,0l-1.6,1.6l3.4,3.4L19.75,7.6z"
                        ></path>
                      </svg>
                    )}
                  </div>
                </div>
                <p>This is all the infos about you.</p>
              </div>
            </div>
          </main>
        </div>
      )}
    </aside>
  );
};
