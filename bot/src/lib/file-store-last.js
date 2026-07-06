// file-store.ts
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
const localStorage = require('node-persist');
localStorage.init({ dir: './storage' });
const pipelineAsync = promisify(pipeline);
const ensureDir = (dir) => {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
};
const processJsonArrayStream = async (filePath, processFn) => {
    if (!fs.existsSync(filePath))
        return;
    await pipelineAsync(createReadStream(filePath, { encoding: 'utf-8' }), parser(), streamArray(), async function* (stream) {
        if (stream) {
            for await (const { value } of stream) {
                processFn(value);
            }
        }
    });
};
export const updateOrAddMultipleItemsInFile = async (filePath, idKey, newItems) => {
    try {
        let items = [];
        // Lecture si le fichier existe
        if (fs.existsSync(filePath)) {
            const data = await filterJsonArray(filePath, () => true);
            if (data) {
                items = data;
            }
        }
        // Mise à jour ou ajout
        for (const newItem of newItems) {
            const index = items.findIndex(item => item[idKey] === newItem[idKey]);
            if (index !== -1) {
                items[index] = newItem; // update
            }
            else {
                items.push(newItem); // add
            }
        }
        // Écriture dans un fichier temporaire, puis renommage
        const tempPath = `${filePath}.tmp`;
        await fs.promises.writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8');
        await fs.promises.rename(tempPath, filePath);
    }
    catch (error) {
        console.error(`Erreur updateOrAddMultipleItemsInFile:`, error);
        throw error;
    }
};
// Optimisation des getters avec streams
const findInJsonArray = async (filePath, predicate) => {
    let result;
    await processJsonArrayStream(filePath, item => {
        if (!result && predicate(item)) {
            result = item;
        }
    });
    return result;
};
const filterJsonArray = async (filePath, predicate) => {
    const results = [];
    await processJsonArrayStream(filePath, item => {
        if (predicate(item)) {
            results.push(item);
        }
    });
    return results;
};
const writeJsonArray = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
export const getOldContacts = async (id) => {
    const contac = await localStorage.getItem('contacts_' + id);
    const contacts = contac ? JSON.parse(contac) : [];
    return contacts;
};
export function createFileStore1(boutiqueId) {
    const basePath = path.join('store', boutiqueId);
    ensureDir(basePath);
    const paths = {
        messages: path.join(basePath, 'messages.json'),
        chats: path.join(basePath, 'chats.json'),
        contacts: path.join(basePath, 'contacts.json'),
        threads: path.join(basePath, 'threads.json')
    };
    // Initialisation des fichiers vides si nécessaire
    Object.values(paths).forEach(filePath => {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]', 'utf-8');
        }
    });
    const saveThread = async (threads) => {
        await updateOrAddMultipleItemsInFile(paths.threads, 'phone', threads);
    };
    const saveContact = async (contacts) => {
        await updateOrAddMultipleItemsInFile(paths.contacts, 'id', contacts);
    };
    return {
        // Initial Load
        initFileData: async (boutiqueId, threads) => {
            if (threads.length)
                await saveThread(threads);
            await getOldContacts(boutiqueId).then(async (data) => {
                if (data && data.length) {
                    await saveContact(data);
                }
            });
        },
        // Create/Update
        saveMessage: async (message) => {
            await updateOrAddMultipleItemsInFile(paths.messages, 'id', message);
        },
        saveChat: async (chat) => {
            await updateOrAddMultipleItemsInFile(paths.chats, 'jid', chat);
        },
        saveContact,
        saveThread,
        // Read
        getMessages: async () => async () => filterJsonArray(paths.messages, () => true),
        getMessage: async (id) => findInJsonArray(paths.messages, m => m.id === id),
        getPollMessages: async (jid) => filterJsonArray(paths.messages, m => m.key?.remoteJid === jid && m.message?.pollCreationMessage),
        getUnrespondMessages: async (jid) => filterJsonArray(paths.messages, m => m.key?.remoteJid === jid && !m.isRespond),
        getCampaignMessages: async (cid) => filterJsonArray(paths.messages, m => m.campaignId == cid),
        getChats: async () => {
            const chats = await filterJsonArray(paths.chats, () => true);
            return chats;
        },
        getChat: async (jid) => await filterJsonArray(paths.chats, c => c.jid === jid),
        // recupérer les propects non enregistré dans les contacts
        getChatsOutContacts: async () => {
            const contacts = await filterJsonArray(paths.contacts, () => true);
            const threads = await filterJsonArray(paths.threads, () => true);
            const chats = await filterJsonArray(paths.chats, () => true);
            const allChats = chats.length ? chats : threads;
            return allChats.filter(c => c.participants?.length == 0 &&
                !contacts.find(contact => contact.id == c.jid || contact.id == c.phone + '@s.whatsapp.net'));
        },
        getContacts: async () => await filterJsonArray(paths.contacts, () => true),
        getContact: async (jid) => await filterJsonArray(paths.contacts, c => c.id === jid),
        getThreads: async () => await filterJsonArray(paths.threads, () => true),
        getThread: async (phone) => await filterJsonArray(paths.threads, c => c.phone === phone),
        //Group manage
        getGroups: async () => await filterJsonArray(paths.chats, c => c.participants?.length > 0),
        getParticipants: async (groupJid) => {
            const group = await filterJsonArray(paths.chats, c => c.jid === groupJid);
            return group?.participants || [];
        },
        addParticipantToGroup: async (groupJid, participant) => {
            const chats = await filterJsonArray(paths.chats, () => true);
            const groupIndex = chats.findIndex(c => c.jid === groupJid);
            if (groupIndex === -1)
                return;
            const group = chats[groupIndex];
            group.participants = group.participants || [];
            const exists = group.participants.some(p => p.jid === participant.jid);
            if (!exists) {
                group.participants.push(participant);
                writeJsonArray(paths.chats, chats);
            }
        },
        updateParticipantInGroup: async (groupJid, participant) => {
            const chats = await filterJsonArray(paths.chats, () => true);
            const group = chats.find(c => c.jid === groupJid);
            if (!group)
                return;
            group.participants = group.participants || [];
            const index = group.participants.findIndex(p => p.jid === participant.jid);
            if (index !== -1) {
                group.participants[index] = participant;
                writeJsonArray(paths.chats, chats);
            }
        },
        removeParticipantFromGroup: async (groupJid, participantJid) => {
            const chats = await filterJsonArray(paths.chats, () => true);
            const group = chats.find(c => c.jid === groupJid);
            if (!group)
                return;
            group.participants = group.participants?.filter(p => p.jid !== participantJid) || [];
            writeJsonArray(paths.chats, chats);
        }
    };
}
