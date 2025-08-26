import { DocumentStore } from "ravendb";

// Example: Using RavenDB AI Agents with the Node.js Client

// 1. Create a DocumentStore instance (point it to your RavenDB server and database).
const store = new DocumentStore("http://127.0.0.1:8080/", "ai-agents");
store.initialize();

// Example entity that will be stored in RavenDB
class Performer {
    public employeeID: string;
    public profit: number;
    public suggestedReward: string;

    constructor(employeeId: string, profit: number, suggestedReward: string) {
        this.employeeID = employeeId;
        this.profit = profit;
        this.suggestedReward = suggestedReward;
    }
}

// 2. Define the AI Agent configuration
const agentConfiguration = {
    name: `Agent-node-${+new Date()}`,
    connectionStringName: "openai-gpt-5-nano",
    systemPrompt: `
        You work for a human experience manager.
        The manager uses your services to find which employee earned the largest profit
        for the company and suggest a reward for this employee.
        The manager provides you with the name of a country, or with the word "everything"
        to indicate all countries.

        Steps:
        1. Use a query tool to load all orders sent to the selected country (or all countries).
        2. Calculate which employee made the largest profit.
        3. Use a query tool to learn in what region the employee lives.
        4. Find suitable vacation sites or other rewards based on the employee's region.
        5. Use an action tool to store the employee's ID, profit, and reward suggestions in the database.

        When you're done, return these details in your answer to the user as well.
    `,
    sampleObject: JSON.stringify({
        employeeID: "the ID of the employee that made the largest profit",
        profit: "the profit the employee made",
        suggestedReward: "your suggestions for a reward"
    }),
    parameters: [
        {
            name: "country",
            description: "A specific country that orders were shipped to, or 'everywhere' to look at all countries"
        }
    ],
    maxModelIterationsPerCall: 3,
    chatTrimming: {
        tokens: {
            maxTokensBeforeSummarization: 32768,
            maxTokensAfterSummarization: 1024
        }
    },
    // Queries the agent can use
    queries: [
        {
            name: "retrieve-orders-sent-to-all-countries",
            description: "Retrieve all orders sent to all countries.",
            query: "from Orders as O select O.Employee, O.Lines.Quantity",
            parametersSampleObject: "{}"
        },
        {
            name: "retrieve-orders-sent-to-a-specific-country",
            description: "Retrieve all orders sent to a specific country",
            query: "from Orders as O where O.ShipTo.Country == $country select O.Employee, O.Lines.Quantity",
            parametersSampleObject: "{}"
        },
        {
            name: "retrieve-performer-living-region",
            description: "Retrieve an employee's country, city, and region by employee ID",
            query: "from Employees as E where id() == $employeeId select E.Address.Country, E.Address.City, E.Address.Region",
            parametersSampleObject: "{ \"employeeId\": \"embed the employee's ID here\" }"
        }
    ],
    // Actions the agent can perform
    actions: [
        {
            name: "store-performer-details",
            description: "Store the employee ID, profit, and suggested reward in the database.",
            parametersSampleObject: "{ \"employeeID\": \"embed the employee's ID here\", \"profit\": \"embed the employee's profit here\", \"suggestedReward\": \"embed your suggestions for a reward here\" }"
        }
    ]
};

async function main() {
    // 3. Create the agent in RavenDB
    const agent = await store.ai.createAgent(agentConfiguration, {
        employeeID: "the ID of the employee that made the largest profit",
        profit: "the profit the employee made",
        suggestedReward: "your suggestions for a reward"
    });

    // 4. Start a conversation with the agent
    const chat = store.ai.conversation(agent.identifier, "Performers-node/", {
        parameters: {
            country: "France"
        }
    });

    // 5. Register the action handler: "store-performer-details"
    chat.handle("store-performer-details", async (req, performer) => {
        const session = store.openSession();
        const rewarded = new Performer(performer.employeeID, performer.profit, performer.suggestedReward);

        await session.store(rewarded);
        await session.saveChanges();
        session.dispose();

        return "done"; // return indication that the action succeeded
    });

    // 6. Ask the agent to suggest a reward
    chat.setUserPrompt("send a few suggestions to reward the employee that made the largest profit");

    // 7. Run the conversation
    const llmResponse = await chat.run();

    console.log("Agent response:", llmResponse);

    if (llmResponse.status === "Done") {
        console.log("Conversation finished.");
    }

    store.dispose();
}

main().catch(err => console.error(err));
