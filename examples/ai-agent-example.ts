import { DocumentStore } from "../src/Documents/DocumentStore.js";
import { 
    AiAgentConfiguration, 
    AiAgentToolQuery, 
    AiAgentToolAction,
    AiAgentPersistenceConfiguration 
} from "../src/Documents/Operations/AI/Agents/index.js";

// Example schema for AI agent responses
interface CustomerSupportResponse {
    answer: string;
    relevant: boolean;
    relatedOrderIds: string[];
    suggestedActions: string[];
}

async function demonstrateAiAgentFeature() {
    // Initialize document store
    const store = new DocumentStore(["http://localhost:8080"], "TestDB");
    store.initialize();

    try {
        // Create an AI agent configuration
        const agentConfig = new AiAgentConfiguration(
            "CustomerSupportAgent",
            "OpenAI-GPT4",
            "You are a helpful customer support assistant for an e-commerce platform. " +
            "Answer customer questions using the available tools to query order and product information."
        );

        // Add query tools (database-side)
        agentConfig.queries.push(
            new AiAgentToolQuery(
                "get_customer_orders",
                "Retrieves orders for a specific customer",
                "from Orders where CustomerId = $customerId"
            ),
            new AiAgentToolQuery(
                "get_product_info",
                "Gets detailed product information",
                "from Products where Id = $productId"
            )
        );

        // Add action tools (client-side)
        agentConfig.actions.push(
            new AiAgentToolAction(
                "send_email",
                "Sends an email to the customer"
            ),
            new AiAgentToolAction(
                "create_support_ticket",
                "Creates a support ticket for escalation"
            )
        );

        // Configure persistence
        agentConfig.persistence = new AiAgentPersistenceConfiguration("chats/", 86400); // 1 day expiration

        // Add required parameters
        agentConfig.parameters.add("customerId");

        // Set sample schema for the AI response format
        agentConfig.sampleObject = JSON.stringify({
            answer: "Answer to the customer question",
            relevant: true,
            relatedOrderIds: ["orders/1", "orders/2"],
            suggestedActions: ["check_shipping", "contact_support"]
        });

        // Create the agent
        const result = await store.ai.createAgent<CustomerSupportResponse>(agentConfig);
        console.log(`Agent created with ID: ${result.identifier}`);

        // Start a conversation
        const conversation = store.ai.startConversation<CustomerSupportResponse>(
            result.identifier,
            builder => builder.addParameter("customerId", "customers/123")
        );

        // Set initial user prompt
        conversation.setUserPrompt("I want to check the status of my recent orders and see if any have shipping delays.");

        // Run the conversation
        let conversationResult = await conversation.run();

        while (conversationResult === "ActionRequired") {
            // Handle required actions
            const actions = conversation.requiredActions();
            console.log(`AI requested ${actions.length} actions:`);
            
            for (const action of actions) {
                console.log(`- ${action.name}: ${action.arguments}`);
                
                // Simulate handling the action
                if (action.name === "send_email") {
                    conversation.addActionResponse(action.toolId, "Email sent successfully");
                } else if (action.name === "create_support_ticket") {
                    conversation.addActionResponse(action.toolId, JSON.stringify({
                        ticketId: "TICKET-123",
                        status: "created"
                    }));
                }
            }

            // Continue the conversation
            conversationResult = await conversation.run();
        }

        // Get the final answer
        const answer = conversation.answer;
        console.log("AI Response:", answer);

        // Continue conversation with follow-up
        conversation.setUserPrompt("Can you also help me track my latest order?");
        conversationResult = await conversation.run();

        if (conversationResult === "Done") {
            console.log("Follow-up response:", conversation.answer);
        }

        // Example of resuming an existing conversation
        const existingConversation = store.ai.resumeConversation<CustomerSupportResponse>(
            conversation.id,
            conversation.changeVector
        );

        existingConversation.setUserPrompt("Thank you for your help!");
        await existingConversation.run();
        console.log("Final response:", existingConversation.answer);

    } finally {
        store.dispose();
    }
}

// Example usage
if (require.main === module) {
    demonstrateAiAgentFeature().catch(console.error);
}

export { demonstrateAiAgentFeature };
