# from fastapi import APIRouter, Depends

# router = APIRouter(prefix="/responsaveis", tags=["responsaveis"])

# @router.post("/create")
# def create_responsavel(responsavel: ResponsavelCreate, db: Session = Depends(get_db)):
#     pass

# router.get("/")
# def get_responsaveis(db: Session = Depends(get_db)):
#     pass

# @router.get("/{id}")
# def get_responsavel(id: int, db: Session = Depends(get_db)):
#     pass

# @router.put("/{id}")
# def update_responsavel(id: int, responsavel: ResponsavelUpdate, db: Session = Depends(get_db)):
#     pass

# @router.delete("/{id}")
# def delete_responsavel(id: int, db: Session = Depends(get_db)):
#     pass
