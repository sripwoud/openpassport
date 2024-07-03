import { MODAL_SERVER_ADDRESS } from "../../../common/src/constants/constants";
import { castCSCAProof } from "../../../common/src/utils/types";
import useUserStore from "../stores/userStore";
import { ModalProofSteps } from "./utils";

export const sendCSCARequest = async (inputs_csca: any, setModalProofStep: (modalProofStep: number) => void) => {
    try {
        console.log("inputs_csca before requesting modal server - cscaRequest.ts");
        fetch(MODAL_SERVER_ADDRESS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inputs_csca)
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        }).then(data => {
            const proof_csca = {
                proof: data.proof,
                publicSignals: data.pub_signals
            }
            useUserStore.getState().cscaProof = proof_csca;
            setModalProofStep(ModalProofSteps.MODAL_SERVER_SUCCESS);
            console.log('Response from server:', data);
        }).catch(error => {
            console.error('Error during request:', error);
            setModalProofStep(ModalProofSteps.MODAL_SERVER_ERROR);
        });
    } catch (error) {
        console.error('Error during request:', error);
        setModalProofStep(ModalProofSteps.MODAL_SERVER_ERROR);
    }
};