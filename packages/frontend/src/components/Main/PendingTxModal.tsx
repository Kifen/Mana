import React, { useEffect } from 'react'
import { Modal, Spinner } from 'react-bootstrap'

interface PendingTxModalProps {
  show: boolean,
  onHide: () => void,
  hash: string | null,
  setTxShow: (arg0: boolean) => void,
}

const PendingTxModal: React.FC<PendingTxModalProps> = ({
  show,
  onHide,
  hash,
  setTxShow,
}: PendingTxModalProps) => {
  useEffect(() => {
    const closeModal = () => {
      setTimeout(() => {
        setTxShow(false)
      }, 10000)
    }
    closeModal()
  }, [show, setTxShow])

  return (
    <div>
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header>
          <Modal.Title style={{ margin: 'auto' }}>
            Transaction Pending
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ margin: 'auto' }}>
          <Spinner
            variant="success"
            animation="border"
            className="mx-auto spin"
          />
        </Modal.Body>

        <Modal.Footer>
          <a
            href={`https://testnet.bscscan.com/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="view-tx"
            style={{ margin: 'auto' }}
          >
            View on bscscan
          </a>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default PendingTxModal
