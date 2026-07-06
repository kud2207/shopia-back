import { MongoClient, ObjectId } from 'mongodb';
// MongoDB connection setup
//const LOCAL_MONGODB_URI = 'mongodb+srv://shopiaapp_db_user:hkrJFemWpqU5A2mi@smarttechlab.twgmgpc.mongodb.net'

const LOCAL_MONGODB_URI = 'mongodb://localhost:27017';
const client = new MongoClient(LOCAL_MONGODB_URI);
let db;
async function connectToDatabase() {
    if (!db) {
        await client.connect();
        db = client.db('whatsapp_business_db1');
    }
    return db;
}
export async function createFileStore(boutiqueId = 'all') {
    await connectToDatabase();
    // Collection names based on boutiqueId
    const collectionNames = {
        messages: `messages_${boutiqueId}`,
        chats: `chats_${boutiqueId}`,
        contacts: `contacts_${boutiqueId}`,
        threads: `threads_${boutiqueId}`,
        shops: 'shops',
        campaigns: `campaigns`,
        participants: `participants_${boutiqueId}`,
        traces: 'traces',
        shoplimits: 'shoplimits'
    };
    // Get references to collections
    const collections = {
        messages: db.collection(collectionNames.messages),
        chats: db.collection(collectionNames.chats),
        contacts: db.collection(collectionNames.contacts),
        threads: db.collection(collectionNames.threads),
        shops: db.collection(collectionNames.shops),
        campaigns: db.collection(collectionNames.campaigns),
        participants: db.collection(collectionNames.participants),
        traces: db.collection(collectionNames.traces),
        shoplimits: db.collection(collectionNames.shoplimits)
    };
    // Create indexes for better query performance
    await Promise.all([
        collections.messages.createIndex({ id: 1 }),
        collections.messages.createIndex({ 'key.remoteJid': 1 }),
        collections.messages.createIndex({ campaignId: 1 }),
        collections.messages.createIndex({ isRespond: 1 }),
        collections.chats.createIndex({ jid: 1 }),
        collections.chats.createIndex({ participants: 1 }),
        collections.contacts.createIndex({ id: 1 }),
        collections.threads.createIndex({ phone: 1 })
    ]);
    const saveThread = async (threads) => {
        if (!threads?.length)
            return;
        const bulkOps = threads.map(thread => ({
            updateOne: {
                filter: { phone: thread.phone },
                update: { $set: thread },
                upsert: true
            }
        }));
        await collections.threads.bulkWrite(bulkOps);
    };
    const saveChat = async (chats) => {
        if (!chats.length)
            return;
        const bulkOps = chats.map(chat => ({
            updateOne: {
                filter: { jid: chat.jid },
                update: { $set: chat },
                upsert: true
            }
        }));
        await collections.chats.bulkWrite(bulkOps);
    };
    const saveContact = async (contacts) => {
        if (!contacts.length)
            return;
        const bulkOps = contacts.map(contact => ({
            updateOne: {
                filter: { id: contact.id },
                update: { $set: contact },
                upsert: true
            }
        }));
        await collections.contacts.bulkWrite(bulkOps);
    };
    const saveShop = async (shop) => {
        if (!shop)
            return;
        const bulkOps = [
            {
                updateOne: {
                    filter: { _id: shop._id },
                    update: { $set: shop },
                    upsert: true
                }
            }
        ];
        await collections.shops.bulkWrite(bulkOps);
    };
    const saveCampaign = async (campaign) => {
        if (!campaign)
            return;
        const bulkOps = [
            {
                updateOne: {
                    filter: { _id: campaign._id },
                    update: { $set: campaign },
                    upsert: true
                }
            }
        ];
        await collections.campaigns.bulkWrite(bulkOps);
    };
    const saveTrace = async (trace) => {
        if (!trace)
            return;
        const bulkOps = [
            {
                updateOne: {
                    filter: { shopId: trace.shopId },
                    update: { $set: trace },
                    upsert: true
                }
            }
        ];
        await collections.traces.bulkWrite(bulkOps);
    };
    const saveCampaignParticipants = async (participants) => {
        if (!participants?.length)
            return;
        const bulkOps = participants.map(participant => ({
            updateOne: {
                filter: { campaign: participant.campaign, jid: participant.jid },
                update: { $set: participant },
                upsert: true
            }
        }));
        await collections.participants.bulkWrite(bulkOps);
    };
    const saveShopLimit = async (limit) => {
        if (!limit)
            return;
        const plain = limit.toObject ? limit.toObject() : limit;
        delete plain._id;
        const bulkOps = [
            {
                updateOne: {
                    filter: { shop: limit.shop },
                    update: { $set: plain },
                    upsert: true
                }
            }
        ];
        await collections.shoplimits.bulkWrite(bulkOps);
    };
    async function getDailyLimit(shopId) {
        const today = new Date().toISOString().split('T')[0];
        let doc = await collections.shoplimits.findOne({ shopId: new ObjectId(shopId) });
        if (!doc || doc.date !== today) {
            const result = await collections.shoplimits.findOneAndUpdate({ shopId: new ObjectId(shopId) }, { $set: { date: today, count: 0, countMessage:0, autoPaused: false } }, // ✅ utiliser $set
            { returnDocument: 'after', upsert: true } // ✅ option correcte
            );
            console.log("result", result);
            doc = result?.value;
        }
        console.log("doc", doc);
        return doc;
    }
    return {
        // Initial Load
     
        // Create/Update
        saveMessage: async (message) => {
            await collections.messages.updateOne({ id: message.id }, { $set: message }, { upsert: true });
        },
        saveChat,
        saveContact,
        saveThread,
        saveShop,
        saveCampaign,
        saveCampaignParticipants,
        saveTrace,
        saveShopLimit,
        // Read
        getMessages: async () => collections.messages.find().toArray(),
        getMessage: async (id) => collections.messages.findOne({ id }),
        getPollMessages: async (jid) => collections.messages
            .find({
            'key.remoteJid': jid,
            'message.pollCreationMessage': { $exists: true }
        })
            .toArray(),
        getUnrespondMessages: async (jid) => collections.messages
            .find({
            'key.remoteJid': jid,
            isRespond: { $ne: true }
        })
            .toArray(),
        getCampaignMessages: async (cid) => collections.messages.find({ campaignId: new ObjectId(cid) }).toArray(),
        getChats: async () => {
            const threads = await collections.threads.find().toArray();
            const chats = await collections.chats.find().toArray();
            const allChats = chats?.length ? chats : threads;
            return allChats.filter(c => !c.participants || c.participants?.length === 0);
        },
        getChat: async (jid) => collections.chats.findOne({ jid }),
        getChatsOutContacts: async () => {
            const contacts = await collections.contacts.find().toArray();
            const threads = await collections.threads.find().toArray();
            const chats = await collections.chats.find().toArray();
            const allChats = chats.length ? chats : threads;
            return allChats.filter(c => {
                if (c.participants && c.participants.length > 0)
                    return false;
                const jid = c.jid || c.phone + '@s.whatsapp.net';
                return !contacts.some(contact => contact.id === jid || contact.id === c.phone + '@s.whatsapp.net');
            });
        },
        getContacts: async () => collections.contacts.find().toArray(),
        getContact: async (jid) => collections.contacts.findOne({ id: jid }),
        getThreads: async () => collections.threads.find().toArray(),
        getThread: async (phone, phone1="") => collections.threads.findOne({ phone: { $in: [phone, phone1] } }),
        getShop: async (id) => collections.shops.findOne({ _id: new ObjectId(id) }),
        getCampaign: async (id) => collections.campaigns.findOne({ _id: new ObjectId(id) }),
        getTrace: async (id) => collections.traces.findOne({ shop: new ObjectId(id) }),
        getTraces: async () => collections.traces.find().toArray(),
        getCampaignParticipants: async (campaignId) => collections.participants.find({ campaign: new ObjectId(campaignId) }).toArray(),
        getCampaignUnsendParticipants: async (campaignId) => collections.participants
            .find({ campaign: new ObjectId(campaignId), isSend: { $exists: false }, isError: { $exists: false } })
            .limit(10)
            .toArray(),
        getCampaigns: async (now) => collections.campaigns
            .find({
            $or: [
                { status: { $in: ['Programmée', 'Active'] }, triggerDate: { $exists: true, $ne: null, $lte: now } },
                { status: 'En cours', nextDate: { $exists: true, $ne: null, $lte: now } }
            ]
        })
            .limit(10)
            .toArray(),
        getShopLimit: async (id) => getDailyLimit(id),
        getShops: async () => collections.shops.find({ isScan: true }).toArray(),
        getTotalSendParticipants: async (id) => collections.participants.countDocuments({ isSend: true, campaign: new ObjectId(id) }),
        getTotalErrorParticipants: async (id) => collections.participants.countDocuments({ isError: true, campaign: new ObjectId(id) }),
        getTotalParticipants: async (id) => collections.participants.countDocuments({ campaign: new ObjectId(id) }),
        // Group manage
        getGroups: async () => collections.chats
            .find({
            participants: { $exists: true, $not: { $size: 0 } }
        })
            .toArray(),
        getParticipants: async (groupJid) => {
            const group = await collections.chats.findOne({ jid: groupJid });
            return group?.participants || [];
        },
        addParticipantToGroup: async (groupJid, participant) => {
            await collections.chats.updateOne({ jid: groupJid }, {
                $addToSet: { participants: participant },
                $setOnInsert: { jid: groupJid } // Create group if it doesn't exist
            }, { upsert: true });
        },
        updateParticipantInGroup: async (groupJid, participant) => {
            await collections.chats.updateOne({
                jid: groupJid,
                'participants.jid': participant.jid
            }, { $set: { 'participants.$': participant } });
        },
        removeParticipantFromGroup: async (groupJid, participantJid) => {
            //@ts-ignore
            await collections.chats.updateOne({ jid: groupJid }, { $pull: { participants: { jid: participantJid } } });
        }
    };
}
// Close connection when application exits
process.on('SIGINT', async () => {
    await client.close();
    process.exit();
});
