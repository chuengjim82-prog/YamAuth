namespace YamAuth.Entity.Abstractions;

public interface IAuditEntity : IEntity
{
    bool IsDeleted { get; set; }
    long CreatorId { get; set; }
    string CreatorNic { get; set; }
    DateTime CreateTime { get; set; }
    long? UpdaterId { get; set; }
    string? UpdaterNic { get; set; }
    DateTime? UpdateTime { get; set; }
    long? DeleterId { get; set; }
    string? DeleterNic { get; set; }
    DateTime? DeleteTime { get; set; }
}
