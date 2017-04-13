import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {IndexDefinition} from "../Indexes/IndexDefinition";
import {DocumentKey} from "../../Documents/IDocument";
import {QueryString} from "../../Http/QueryString";

export class BatchCommand extends RavenCommand {
    protected commandsArray?: any[];
    protected data?: any[];

    constructor(commandsArray) {
        super('', RequestMethods.Post);

        this.commandsArray = commandsArray;

    }

    public createRequest(serverNode: ServerNode): void {
        let data = [];
        for(let command in this.commandsArray) {
            if(!command.hasOwnProperty('command')) {
                throw new ErrorResponseException('Not a valid command');
            }
            data.push(command)
        }

        this.endPoint = StringUtil.format('{url}/databases/{database}/bulk_docs', serverNode);
        this.data = data;

    }

    public setResponse(response: IResponse): IRavenCommandResponse | null | void {

        if (response && response.statusCode == 200) {
            return response.toJson() as IRavenCommandResponse;
        }
    }
}


// class BatchCommand(RavenCommand):
// def __init__(self, commands_array):
// super(BatchCommand, self).__init__(method="POST")
// self.commands_array = commands_array
//
// def create_request(self, server_node):
// data = []
// for command in self.commands_array:
// if not hasattr(command, 'command'):
// raise ValueError("Not a valid command")
// data.append(command.to_json())
//
// self.url = "{0}/databases/{1}/bulk_docs".format(server_node.url, server_node.database)
// self.data = data
//
// def set_response(self, response):
// try:
// response = response.json()
// if "Error" in response:
// raise ValueError(response["Error"])
// return response["Results"]
// except ValueError as e:
// raise exceptions.InvalidOperationException(e)